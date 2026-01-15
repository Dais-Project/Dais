from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), "..", ".."))

naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}


from db.models import Base
from db.models import *

target_metadata = Base.metadata
Base.metadata.naming_convention = naming_convention

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

from db.models.utils import DataClassJSON, DataclassListJSON, PydanticJSON

def render_item(type_, obj, autogen_context):
    # --- 为 DataClassJSON 类型提供渲染规则 ---
    if type_ == 'type' and isinstance(obj, DataClassJSON):
        # 从类型实例中获取它关联的 dataclass
        dataclass_type = obj.dataclass_type
        
        # 添加自定义类型本身的 import
        autogen_context.imports.add("from db.models.utils import DataClassJSON")
        
        # 添加关联的 dataclass 的 import
        # obj.dataclass_type.__module__ 获取模块名，.__name__ 获取类名
        autogen_context.imports.add(
            f"from {dataclass_type.__module__} import {dataclass_type.__name__}"
        )
        
        # 返回一个带有参数的、完整的构造函数调用字符串
        return f"DataClassJSON({dataclass_type.__name__})"

    # --- 为 DataclassListJSON 类型提供渲染规则 ---
    if type_ == 'type' and isinstance(obj, DataclassListJSON):
        dataclass_type = obj.dataclass_type

        # 添加自定义类型本身的 import
        autogen_context.imports.add("from db.models.utils import DataclassListJSON")
        
        # 添加关联的 dataclass 的 import
        autogen_context.imports.add(
            f"from {dataclass_type.__module__} import {dataclass_type.__name__}"
        )

        # 返回正确的构造函数调用
        return f"DataclassListJSON({dataclass_type.__name__})"

    if type_ == 'type' and isinstance(obj, PydanticJSON):
        autogen_context.imports.add("from db.models.utils import PydanticJSON")
        return f"PydanticJSON(None)"

    # 对于所有其他情况，返回 False 让 Alembic 使用默认的渲染逻辑
    return False

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=(connection.dialect.name == "sqlite"),
            render_item=render_item,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
