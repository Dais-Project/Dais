import sys
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import Engine
from sqlalchemy import create_engine

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))


@pytest.fixture
def migration_db_path(tmp_path: Path) -> Path:
    return tmp_path / "migration_test.sqlite"


@pytest.fixture
def alembic_config(migration_db_path: Path) -> Config:
    cfg = Config(str(PROJECT_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(PROJECT_ROOT / "src/db/alembic"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{migration_db_path}")
    cfg.set_main_option("prepend_sys_path", str(SRC_ROOT))
    return cfg


@pytest.fixture
def alembic_engine(alembic_config: Config) -> Engine:
    main_config = alembic_config.get_main_option("sqlalchemy.url")
    assert main_config is not None
    return create_engine(main_config)
