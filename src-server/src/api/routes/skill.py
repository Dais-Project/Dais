import asyncio
import zipfile
from typing import IO
from fastapi import APIRouter, BackgroundTasks, status, File, UploadFile
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate
from dais_sdk.types import InvalidSkillArchiveError
from dais_sdk.skill import Skill
from dais_sdk.skill.resource import TextResource
from src.agent.skills import SkillMaterializer
from src.db import DbSessionDep
from src.db.models import skill as skill_models
from src.services.skill import SkillService
from src.schemas import skill as skill_schemas
from ..exceptions import ApiError, ApiErrorCode


skills_router = APIRouter(tags=["skill"])

def process_archive(file_obj: IO[bytes]) -> skill_schemas.SkillCreate:
    file_obj.seek(0)
    with zipfile.ZipFile(file_obj, "r") as zip_file:
        try:
            skill = Skill.from_zip(zip_file)
        except InvalidSkillArchiveError:
            raise ApiError(status.HTTP_400_BAD_REQUEST, ApiErrorCode.INVALID_SKILL_ARCHIVE, "Invalid skill archive")
    return skill_schemas.SkillCreate(
        name=skill.name,
        description=skill.description,
        is_enabled=True,
        content=skill.content,
        resources=[
            skill_schemas.SkillResourceBase(
                relative=res.relative,
                content=res.content,
            )
            for res in skill.resources
            if isinstance(res, TextResource)
        ],
    )

def start_materializing_background_task(background_tasks: BackgroundTasks, skill_ent: skill_models.Skill):
    skill_data = skill_schemas.SkillRead.model_validate(skill_ent)
    async def clear_and_rematerialize(skill: skill_schemas.SkillRead):
        await SkillMaterializer.clear_materialized(skill)
        await SkillMaterializer.materialize_skill(skill)
    background_tasks.add_task(clear_and_rematerialize, skill_data)

@skills_router.get("/", response_model=Page[skill_schemas.SkillBrief])
async def get_skills(db_session: DbSessionDep):
    query = SkillService(db_session).get_skills_query()
    return await apaginate(db_session, query)

@skills_router.get("/{skill_id}", response_model=skill_schemas.SkillRead)
async def get_skill(skill_id: int, db_session: DbSessionDep):
    return await SkillService(db_session).get_skill_by_id(skill_id)

@skills_router.post("/", status_code=status.HTTP_201_CREATED, response_model=skill_schemas.SkillRead)
async def create_skill(
    db_session: DbSessionDep,
    body: skill_schemas.SkillCreate,
    background_tasks: BackgroundTasks,
):
    created_skill = await SkillService(db_session).create_skill(body)
    start_materializing_background_task(background_tasks, created_skill)
    return created_skill

@skills_router.post("/upload", status_code=status.HTTP_201_CREATED, response_model=skill_schemas.SkillRead)
async def upload_archive(
    db_session: DbSessionDep,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    file_obj = file.file

    if not zipfile.is_zipfile(file_obj):
        raise ApiError(status.HTTP_400_BAD_REQUEST, ApiErrorCode.INVALID_SKILL_ARCHIVE, "Invalid skill archive")

    skill_create = await asyncio.to_thread(process_archive, file_obj)
    created_skill = await SkillService(db_session).create_skill(skill_create)
    start_materializing_background_task(background_tasks, created_skill)
    return created_skill

@skills_router.put("/{skill_id}", response_model=skill_schemas.SkillRead)
async def update_skill(
    skill_id: int,
    body: skill_schemas.SkillUpdate,
    db_session: DbSessionDep,
    background_tasks: BackgroundTasks,
):
    updated_skill = await SkillService(db_session).update_skill(skill_id, body)
    start_materializing_background_task(background_tasks, updated_skill)
    return updated_skill

@skills_router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: int,
    db_session: DbSessionDep,
    background_tasks: BackgroundTasks,
):
    deleted_skill = await SkillService(db_session).delete_skill(skill_id)
    skill_data = skill_schemas.SkillRead.model_validate(deleted_skill)
    background_tasks.add_task(SkillMaterializer.clear_materialized, skill_data)
