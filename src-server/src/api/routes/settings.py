from typing import Annotated
from fastapi import APIRouter, Depends, Request
from ...settings import AppSettingManager, AppSettings

settings_router = APIRouter(tags=["settings"])

def get_app_setting_manager(request: Request) -> AppSettingManager:
    return request.state.app_setting_manager

AppSettingManagerDep = Annotated[AppSettingManager, Depends(get_app_setting_manager)]

@settings_router.get("/", response_model=AppSettings)
def get_settings(setting_manager: AppSettingManagerDep):
    return setting_manager.settings

@settings_router.put("/", response_model=AppSettings)
def update_settings(
    body: AppSettings,
    setting_manager: AppSettingManagerDep,
):
    setting_manager.update(body)
    setting_manager.persist()
    return setting_manager.settings
