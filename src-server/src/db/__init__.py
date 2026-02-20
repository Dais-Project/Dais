from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from platformdirs import user_data_dir
from .models import (
    provider as provider_models,
    agent as agent_models,
    workspace as workspace_models,
    toolset as toolset_models
)
# this unused import is necessary to alembic
from . import models
from src.common import APP_NAME

data_dir = Path(user_data_dir(APP_NAME, appauthor=False, ensure_exists=True))
db_path = data_dir / "sqlite.db"

engine = create_engine(f"sqlite:///{db_path}")
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def init_initial_data():
    with SessionLocal() as session:
        provider_models.init(session)
        agent_models.init(session)
        workspace_models.init(session)
        toolset_models.init(session)

def migrate_db():
    from alembic.config import Config
    from alembic import command
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
    command.upgrade(alembic_cfg, "head")
    init_initial_data()
