import asyncio
import zipfile
from typing import IO
from fastapi import APIRouter, status, File, UploadFile
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate
from dais_sdk.types import InvalidSkillArchiveError
from dais_sdk.skill import Skill
from dais_sdk.skill.resource import TextResource
from src.db import DbSessionDep
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
):
    return await SkillService(db_session).create_skill(body)

@skills_router.post("/upload", status_code=status.HTTP_201_CREATED, response_model=skill_schemas.SkillRead)
def upload_archive(db_session: DbSessionDep, file: UploadFile = File(...)):
    file_obj = file.file

    if not zipfile.is_zipfile(file_obj):
        raise ApiError(status.HTTP_400_BAD_REQUEST, ApiErrorCode.INVALID_SKILL_ARCHIVE, "Invalid skill archive")

    skill_create = process_archive(file_obj)
    result = asyncio.run(SkillService(db_session).create_skill(skill_create))
    return result

@skills_router.put("/{skill_id}", response_model=skill_schemas.SkillRead)
async def update_skill(
    skill_id: int,
    body: skill_schemas.SkillUpdate,
    db_session: DbSessionDep,
):
    return await SkillService(db_session).update_skill(skill_id, body)

@skills_router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(skill_id: int, db_session: DbSessionDep):
    await SkillService(db_session).delete_skill(skill_id)
