import atexit
import json
from pathlib import Path
from typing import Any
from platformdirs import user_data_dir
from pydantic import model_validator
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict
from .services.llm_model import LlmModelService
from .common import APP_NAME
from .utils.singleton import SingletonModelSync

data_dir = Path(user_data_dir(APP_NAME, appauthor=False, ensure_exists=True))

class JsonFileSettingsSource(PydanticBaseSettingsSource):
    def __init__(self, settings_cls: type[BaseSettings], config_path: Path):
        super().__init__(settings_cls)
        self.config_path = config_path

    def get_field_value(self, field, field_name):
        return None, field_name, False

    def __call__(self) -> dict[str, Any]:
        if not self.config_path.exists():
            return {}
        try:
            return json.loads(self.config_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}


class JsonSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=None,
        env_ignore_empty=True,
        extra="ignore",
    )
    _has_registered_atexit = False

    @classmethod
    def settings_path(cls):
        return data_dir / "settings.json"

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        return (
            init_settings,
            JsonFileSettingsSource(settings_cls, cls.settings_path()),
        )

    def model_post_init(self, __context: Any) -> None:
        if not self.__class__._has_registered_atexit:
            atexit.register(self.save)
            self.__class__._has_registered_atexit = True

    def save(self):
        data = self.model_dump(mode="json")
        self.settings_path().write_text(
            json.dumps(data, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

class AppSettings(JsonSettings, metaclass=SingletonModelSync):
    reply_language: str = "zh_CN"
    flash_model: int | None = None

    @model_validator(mode="after")
    def validate_flash_model(self) -> AppSettings:
        if self.flash_model is not None:
            with LlmModelService() as service:
                try:
                    service.get_model_by_id(self.flash_model)
                except:
                    self.flash_model = None
        return self
