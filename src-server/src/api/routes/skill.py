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
from fastapi import APIRouter, File, Query, UploadFile, status
from fastapi_pagination import Page

from src.schemas import skill as skill_schemas

from ..dependencies import SkillServiceDep
from ..exceptions import ApiError, ApiErrorCode


skills_router = APIRouter(tags=["skill"])

def process_archive(file: bytes | IO[bytes]) -> skill_schemas.SkillCreate:
    file_obj = io.BytesIO(file) if isinstance(file, bytes) else file
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


@skills_router.get("/", response_model=Page[skill_schemas.SkillBrief])
async def get_skills(service: SkillServiceDep,
                     query: str | None = Query(default=None)):
    return await service.get_page(query)

@skills_router.post("/scan-repo", response_model=list[skill_schemas.ScannedSkillRead])
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
async def install_from_github(service: SkillServiceDep, body: skill_schemas.InstallFromGithubRequest):
    async def download_task(repo_url: str, skill_path: str) -> skill_schemas.SkillCreate:
        nonlocal sem
        async with sem:
            try:
                zip_bytes = await download_skill_zip(repo_url, skill_path)
            except (ScannerInvalidRepoUrlError, DownloaderInvalidRepoUrlError) as e:
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
            return await asyncio.to_thread(process_archive, zip_bytes)

    sem = asyncio.Semaphore(5)
    download_tasks = [download_task(body.repo_url, skill_path) for skill_path in body.skill_paths]
    skill_creates = await asyncio.gather(*download_tasks)

    return await service.create_ignoring_duplicates(skill_creates)

@skills_router.get("/{skill_id}", response_model=skill_schemas.SkillRead)
async def get_skill(service: SkillServiceDep, skill_id: int):
    return await service.get_by_id(skill_id)

@skills_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=skill_schemas.SkillRead,
)
async def create_skill(service: SkillServiceDep, body: skill_schemas.SkillCreate):
    return await service.create(body)

@skills_router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    response_model=skill_schemas.SkillRead,
)
async def upload_archive(service: SkillServiceDep, file: UploadFile = File(...)):
    file_obj = file.file

    if not zipfile.is_zipfile(file_obj):
        raise ApiError(
            status.HTTP_400_BAD_REQUEST,
            ApiErrorCode.INVALID_SKILL_ARCHIVE,
            "Invalid skill archive",
        )

    skill_create = await asyncio.to_thread(process_archive, file_obj)
    return await service.create(skill_create)

@skills_router.put("/{skill_id}", response_model=skill_schemas.SkillRead)
async def update_skill(service: SkillServiceDep,
                       skill_id: int,
                       body: skill_schemas.SkillUpdate):
    return await service.update(skill_id, body)

@skills_router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(service: SkillServiceDep, skill_id: int):
    await service.delete(skill_id)
