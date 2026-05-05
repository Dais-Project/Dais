import shutil
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from anyio import Path as AnyioPath

from src.agent.skills import SkillMaterializer
from src.db.models import skill as skill_models
from src.schemas import skill as skill_schemas


@pytest.mark.integration
class TestSkillMaterializer:
    @pytest.mark.asyncio
    async def test_materialize_all_clears_root_dir_then_materializes_each_skill(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("src.agent.skills.materializer.DATA_DIR", tmp_path)

        skill_a = MagicMock(spec=skill_models.Skill)
        skill_a.id = 1
        skill_b = MagicMock(spec=skill_models.Skill)
        skill_b.id = 2

        skill_service = AsyncMock()
        skill_service.get_all_skills.return_value = [skill_a, skill_b]

        materialize_mock = AsyncMock()
        skill_read_mock = MagicMock(side_effect=[
            skill_schemas.SkillRead.model_validate({
                "id": 1,
                "name": "Skill A",
                "description": "Description A",
                "is_enabled": True,
                "content": "# Skill A",
                "resources": [],
            }),
            skill_schemas.SkillRead.model_validate({
                "id": 2,
                "name": "Skill B",
                "description": "Description B",
                "is_enabled": True,
                "content": "# Skill B",
                "resources": [],
            }),
        ])
        to_thread_mock = AsyncMock()

        with patch("src.agent.skills.materializer.db_context") as mock_db_context:
            mock_db_context.return_value.__aenter__ = AsyncMock(return_value=AsyncMock())
            mock_db_context.return_value.__aexit__ = AsyncMock(return_value=False)
            with patch("src.agent.skills.materializer.SkillService", return_value=skill_service):
                with patch("src.agent.skills.materializer.asyncio.to_thread", to_thread_mock):
                    with patch.object(SkillMaterializer, "materialize", materialize_mock):
                        with patch.object(skill_schemas.SkillRead, "model_validate", skill_read_mock):
                            await SkillMaterializer.materialize_all()

        skills_root_dir = AnyioPath(tmp_path / ".skills")
        to_thread_mock.assert_awaited_once_with(shutil.rmtree, skills_root_dir)
        assert materialize_mock.await_count == 2
