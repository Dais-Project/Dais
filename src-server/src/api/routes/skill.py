import asyncio
import io
import zipfile
from typing import IO

from dais_skills import (
    InvalidSkillArchiveError,
    InvalidSkillPathError,
    Skill,
    SkillPathNotFoundError,
    download_skill_zip,
    scan_repo,
)
from dais_skills.downloader import DownloaderError
from dais_skills.downloader.exceptions import (
    InvalidRepoUrlError as DownloaderInvalidRepoUrlError,
)
from dais_skills.scanner import ScannerError
from dais_skills.scanner.exceptions import (
    InvalidRepoUrlError as ScannerInvalidRepoUrlError,
)
from fastapi import APIRouter, BackgroundTasks, File, Query, UploadFile, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate

from src.agent.skills import SkillMaterializer
from src.db.models import skill as skill_models
from src.schemas import skill as skill_schemas
from src.services.skill import SkillService

from ..dependencies import DbSessionDep
from ..exceptions import ApiError, ApiErrorCode


skills_router = APIRouter(tags=["skill"])

def process_archive(file_obj: IO[bytes]) -> skill_schemas.SkillCreate:
    file_obj.seek(0)
    with zipfile.ZipFile(file_obj, "r") as zip_file:
        try:
            skill = Skill.from_zip(zip_file)
        except InvalidSkillArchiveError:
            raise ApiError(
                status.HTTP_400_BAD_REQUEST,
                ApiErrorCode.INVALID_SKILL_ARCHIVE,
                "Invalid skill archive",
            )
    return skill_schemas.SkillCreate(
        name=skill.name,
        description=skill.description,
        content=skill.content,
        resources=[
            skill_schemas.SkillResourceBase(
                relative=res.relative,
                content=res.content,
            )
            for res in skill.resources
            if res.type == "text"
        ],
    )

def process_archive_bytes(data: bytes) -> skill_schemas.SkillCreate:
    return process_archive(io.BytesIO(data))

def start_materializing_background_task(
    background_tasks: BackgroundTasks,
    skill_ent: skill_models.Skill,
):
    skill_data = skill_schemas.SkillRead.model_validate(skill_ent)

    async def clear_and_rematerialize(skill: skill_schemas.SkillRead):
        await SkillMaterializer.clear_materialized(skill.id)
        await SkillMaterializer.materialize(skill)

    background_tasks.add_task(clear_and_rematerialize, skill_data)

@skills_router.get("/", response_model=Page[skill_schemas.SkillBrief])
async def get_skills(
    db_session: DbSessionDep,
    query: str | None = Query(default=None),
):
    db_query = SkillService(db_session).get_skills_query(query)
    return await apaginate(db_session, db_query)

@skills_router.post(
    "/scan-repo",
    response_model=list[skill_schemas.ScannedSkillRead],
)
async def scan_repo_skills(body: skill_schemas.ScanRepoRequest):
    try:
        scanned = await scan_repo(body.repo_url)
    except ScannerInvalidRepoUrlError as e:
        raise ApiError(
            status.HTTP_400_BAD_REQUEST,
            ApiErrorCode.INVALID_GITHUB_REPO_URL,
            str(e) or "Invalid GitHub repository URL",
        )
    except ScannerError as e:
        raise ApiError(
            status.HTTP_502_BAD_GATEWAY,
            ApiErrorCode.SKILL_REPO_SCAN_FAILED,
            str(e) or "Failed to scan repository for skills",
        )

    return [
        skill_schemas.ScannedSkillRead(
            path=item.path,
            name=item.name,
            description=item.description,
        )
        for item in scanned
    ]

@skills_router.post(
    "/install-from-github",
    status_code=status.HTTP_201_CREATED,
    response_model=list[skill_schemas.SkillRead],
)
async def install_from_github(
    body: skill_schemas.InstallFromGithubRequest,
    db_session: DbSessionDep,
    background_tasks: BackgroundTasks,
):
    skill_creates: list[skill_schemas.SkillCreate] = []

    for skill_path in body.skill_paths:
        try:
            zip_bytes = await download_skill_zip(body.repo_url, skill_path)
        except (
            ScannerInvalidRepoUrlError,
            DownloaderInvalidRepoUrlError,
        ) as e:
            raise ApiError(
                status.HTTP_400_BAD_REQUEST,
                ApiErrorCode.INVALID_GITHUB_REPO_URL,
                str(e) or "Invalid GitHub repository URL",
            )
        except (InvalidSkillPathError, SkillPathNotFoundError) as e:
            raise ApiError(
                status.HTTP_404_NOT_FOUND,
                ApiErrorCode.SKILL_PATH_NOT_FOUND,
                str(e) or f"Skill path not found: {skill_path}",
            )
        except DownloaderError as e:
            raise ApiError(
                status.HTTP_502_BAD_GATEWAY,
                ApiErrorCode.SKILL_DOWNLOAD_FAILED,
                str(e) or f"Failed to download skill: {skill_path}",
            )

        skill_creates.append(
            await asyncio.to_thread(process_archive_bytes, zip_bytes)
        )

    service = SkillService(db_session)
    created_skills: list[skill_models.Skill] = []
    for skill_create in skill_creates:
        created_skill = await service.create_skill(skill_create)
        created_skills.append(created_skill)

    for created_skill in created_skills:
        start_materializing_background_task(background_tasks, created_skill)

    return created_skills

@skills_router.get("/{skill_id}", response_model=skill_schemas.SkillRead)
async def get_skill(skill_id: int, db_session: DbSessionDep):
    return await SkillService(db_session).get_skill_by_id(skill_id)

@skills_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=skill_schemas.SkillRead,
)
async def create_skill(
    db_session: DbSessionDep,
    body: skill_schemas.SkillCreate,
    background_tasks: BackgroundTasks,
):
    created_skill = await SkillService(db_session).create_skill(body)
    start_materializing_background_task(background_tasks, created_skill)
    return created_skill

@skills_router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    response_model=skill_schemas.SkillRead,
)
async def upload_archive(
    db_session: DbSessionDep,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    file_obj = file.file

    if not zipfile.is_zipfile(file_obj):
        raise ApiError(
            status.HTTP_400_BAD_REQUEST,
            ApiErrorCode.INVALID_SKILL_ARCHIVE,
            "Invalid skill archive",
        )

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
    background_tasks.add_task(SkillMaterializer.clear_materialized, deleted_skill.id)
