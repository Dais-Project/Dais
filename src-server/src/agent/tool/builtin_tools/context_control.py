import xml.etree.ElementTree as ET
from anyio import Path
from typing import override
from src.db import db_context
from src.schemas import skill as skill_schemas
from src.common import DATA_DIR
from src.services.skill import SkillService
from ..toolset_wrapper import built_in_tool, BuiltInToolDefaults, BuiltInToolset, BuiltInToolsetContext


async def materialize_skill(skill: skill_schemas.SkillRead, hash: str) -> Path:
    """
    Materialize a skill to a temporary directory and return the directory absolute path.
    """
    skills_dir = Path(DATA_DIR, ".skills", str(skill.id))
    await skills_dir.mkdir(parents=True, exist_ok=True)
    hash_file = skills_dir / "hash.txt"
    skill_resources_dir = skills_dir / "resources"
    await skill_resources_dir.mkdir(parents=True, exist_ok=True)
    is_changed = (not await hash_file.exists()) or (await hash_file.read_text("utf-8") != hash)
    if is_changed:
        for resource in skill.resources:
            resource_path = skill_resources_dir / resource.relative
            await resource_path.parent.mkdir(parents=True, exist_ok=True)
            await resource_path.write_text(resource.content, "utf-8")
        await hash_file.write_text(hash, "utf-8")
    return skill_resources_dir

class ContextControlToolset(BuiltInToolset):
    @property
    @override
    def name(self) -> str: return "ContextControl"

    @built_in_tool(validate=True, defaults=BuiltInToolDefaults(auto_approve=True))
    async def load_skill(self, id: int, name: str) -> str:
        """
        Load a Skill by its ID.

        Returns:
            An XML structure containing:
            - resources_dir:
                Path to the temporary directory where the Skill's associated resource files have been written.
                Use this path when the Skill's content references resource files.
            - skill_content:
                The full Skill instruction content.
                Treat this as a task-specific instruction that guides how to complete the current task.

            Example:
                <load_skill_result>
                    <resources_dir>/tmp/skill-123</resources_dir>
                    <skill_content>...</skill_content>
                </load_skill_result>

        How to use resources_dir:
            The Skill's content may reference resource files by their bare filename (e.g. "template.docx",
            "data.csv"). To resolve the absolute path of any such file, join resources_dir with the filename:

                absolute_path = resources_dir + "/" + filename

            Example:
                If resources_dir is "/tmp/skill-123/resources" and the Skill references "references/template.docx",
                the file is located at "/tmp/skill-123/resources/references/template.docx".

            Notes:
                - Always use resources_dir as the base path; do not assume any other location.
                - The directory is temporary and only valid for the duration of the current task.
                - If a referenced file is not found under resources_dir, treat it as unavailable and proceed without it (or report the issue if the file is essential).
        """
        async with db_context() as db_session:
            skill = await SkillService(db_session).get_skill_by_id(id)
        skill_resources_dir = await materialize_skill(skill_schemas.SkillRead.model_validate(skill), skill.hash)

        root = ET.Element("load_skill_result")
        ET.SubElement(root, "resources_dir").text = str(skill_resources_dir)
        ET.SubElement(root, "skill_content").text = skill.content
        return ET.tostring(root, encoding="unicode")
