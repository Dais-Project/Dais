import asyncio
from fastapi import APIRouter
from ...settings import AppSettings, use_app_setting_manager

settings_router = APIRouter(tags=["settings"])

@settings_router.get("/", response_model=AppSettings)
async def get_settings():
    setting_manager = use_app_setting_manager()
    return setting_manager.settings

@settings_router.put("/", response_model=AppSettings)
async def update_settings(body: AppSettings):
    setting_manager = use_app_setting_manager()
    await setting_manager.update(body)
    await setting_manager.persist()
    return setting_manager.settings
