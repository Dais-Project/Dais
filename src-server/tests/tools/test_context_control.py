from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
import xml.etree.ElementTree as ET

import pytest

from src.services.skill import SkillService
from src.agent.tool.builtin_tools import context_control
from src.agent.tool.builtin_tools.context_control import ContextControlToolset, materialize_skill
from src.agent.tool.toolset_wrapper import BuiltInToolsetContext
from src.schemas import skill as skill_schemas


def make_skill_read(
    skill_id: int,
    content: str,
    resources: list[tuple[str, str]],
) -> skill_schemas.SkillRead:
    return skill_schemas.SkillRead(
        id=skill_id,
        name=f"Skill {skill_id}",
        description="",
        is_enabled=True,
        content=content,
        resources=[
            skill_schemas.SkillResourceRead(
                id=index + 1,
                relative=relative,
                content=resource_content,
            )
            for index, (relative, resource_content) in enumerate(resources)
        ],
    )


def parse_load_skill_xml(result: str) -> tuple[ET.Element, ET.Element, ET.Element]:
    root = ET.fromstring(result)
    resources_dir_el = root.find("resources_dir")
    skill_content_el = root.find("skill_content")

    assert resources_dir_el is not None
    assert skill_content_el is not None
    return root, resources_dir_el, skill_content_el


class TestMaterializeSkill:
    def test_materialize_skill_creates_files_for_first_write(self, monkeypatch: pytest.MonkeyPatch, temp_workspace: Path):
        monkeypatch.setattr(context_control, "DATA_DIR", temp_workspace)
        skill = make_skill_read(
            skill_id=7,
            content="Skill instruction",
            resources=[
                ("README.md", "hello"),
                ("docs/setup/guide.md", "nested"),
            ],
        )

        resources_dir = materialize_skill(skill, "hash-v1")

        assert resources_dir == temp_workspace / ".skills" / "7" / "resources"
        assert (resources_dir / "README.md").read_text(encoding="utf-8") == "hello"
        assert (resources_dir / "docs" / "setup" / "guide.md").read_text(encoding="utf-8") == "nested"
        assert (temp_workspace / ".skills" / "7" / "hash.txt").read_text(encoding="utf-8") == "hash-v1"

    def test_materialize_skill_does_not_overwrite_when_hash_is_unchanged(
        self,
        monkeypatch: pytest.MonkeyPatch,
        temp_workspace: Path,
    ):
        monkeypatch.setattr(context_control, "DATA_DIR", temp_workspace)

        original_skill = make_skill_read(
            skill_id=3,
            content="Skill instruction",
            resources=[("guide.txt", "version-1")],
        )
        materialize_skill(original_skill, "same-hash")

        updated_skill = make_skill_read(
            skill_id=3,
            content="Skill instruction",
            resources=[("guide.txt", "version-2")],
        )
        resources_dir = materialize_skill(updated_skill, "same-hash")

        assert (resources_dir / "guide.txt").read_text(encoding="utf-8") == "version-1"
        assert (temp_workspace / ".skills" / "3" / "hash.txt").read_text(encoding="utf-8") == "same-hash"

    def test_materialize_skill_overwrites_resources_when_hash_changes(
        self,
        monkeypatch: pytest.MonkeyPatch,
        temp_workspace: Path,
    ):
        monkeypatch.setattr(context_control, "DATA_DIR", temp_workspace)

        first_skill = make_skill_read(
            skill_id=9,
            content="Skill instruction",
            resources=[("guide.txt", "old-content")],
        )
        materialize_skill(first_skill, "hash-old")

        second_skill = make_skill_read(
            skill_id=9,
            content="Skill instruction",
            resources=[("guide.txt", "new-content")],
        )
        resources_dir = materialize_skill(second_skill, "hash-new")

        assert (resources_dir / "guide.txt").read_text(encoding="utf-8") == "new-content"
        assert (temp_workspace / ".skills" / "9" / "hash.txt").read_text(encoding="utf-8") == "hash-new"


@dataclass
class FakeSkillResource:
    id: int
    relative: str
    content: str


@dataclass
class FakeSkill:
    id: int
    name: str
    hash: str
    description: str
    is_enabled: bool
    content: str
    resources: list[FakeSkillResource]


class TestLoadSkill:
    @pytest.mark.asyncio
    async def test_load_skill_returns_materialized_skill_result(
        self,
        monkeypatch: pytest.MonkeyPatch,
        built_in_toolset_context: BuiltInToolsetContext,
        temp_workspace: Path,
    ):
        fake_db_session = object()

        @asynccontextmanager
        async def fake_db_context():
            yield fake_db_session

        fake_skill = FakeSkill(
            id=42,
            name="Test Skill",
            hash="skill-hash",
            description="",
            is_enabled=True,
            content="Use these instructions",
            resources=[
                FakeSkillResource(id=1, relative="tool.md", content="tool content"),
            ],
        )

        class FakeSkillService:
            def __init__(self, db_session):
                self.db_session = db_session

            async def get_skill_by_id(self, skill_id: int):
                return fake_skill

        expected_resources_dir = temp_workspace / "materialized" / "resources"

        def fake_materialize_skill(skill: skill_schemas.SkillRead, hash: str) -> Path:
            return expected_resources_dir

        monkeypatch.setattr(context_control, "db_context", fake_db_context)
        monkeypatch.setattr(context_control, "SkillService", FakeSkillService)
        monkeypatch.setattr(context_control, "materialize_skill", fake_materialize_skill)

        tool = ContextControlToolset(built_in_toolset_context)
        result = await tool.load_skill(id=99, name="Test Skill")
        root, resources_dir_el, skill_content_el = parse_load_skill_xml(result)

        assert root.tag == "load_skill_result"
        assert resources_dir_el.text == str(expected_resources_dir)
        assert skill_content_el.text == "Use these instructions"
