# -*- mode: python ; coding: utf-8 -*-
import os
import litellm
import magika

# litellm resources
litellm_path = os.path.dirname(litellm.__file__)
tokenizer_path = os.path.join(litellm_path, "litellm_core_utils", "tokenizers")
endpoints_path = os.path.join(litellm_path, "containers", "endpoints.json")

project_root = SPECPATH
# alembic resources
alembic_ini_path = os.path.join(project_root, "alembic.ini")
alembic_dir = os.path.join(project_root, "src", "db", "alembic")
alembic_env_path = os.path.join(alembic_dir, "env.py")
alembic_migrations_dir = os.path.join(alembic_dir, "versions")

# magika resources
magika_pkg_dir = os.path.dirname(magika.__file__)
magika_config_dir = os.path.join(magika_pkg_dir, "config")
magika_models_dir = os.path.join(magika_pkg_dir, "models")

a = Analysis(
    ["entry.py"],
    pathex=[],
    binaries=[],
    datas=[
        (tokenizer_path, "litellm/litellm_core_utils/tokenizers"),
        (endpoints_path, "litellm/containers"),

        (alembic_ini_path, "."),
        (alembic_env_path, "src/db/alembic"),
        (alembic_migrations_dir, "src/db/alembic/versions"),

        (magika_config_dir, "magika/config"),
        (magika_models_dir, "magika/models"),
    ],
    hiddenimports=[
        "aiosqlite",
        "sqlalchemy.dialects.sqlite.aiosqlite",
        "tiktoken_ext.openai_public",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="server",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="server",
)
