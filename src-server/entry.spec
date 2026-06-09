# -*- mode: python ; coding: utf-8 -*-
import os
import platform
from PyInstaller.utils.hooks import collect_data_files


project_root = SPECPATH

# alembic resources
alembic_ini_path = os.path.join(project_root, "alembic.ini")
alembic_dir = os.path.join(project_root, "src", "db", "alembic")
alembic_env_path = os.path.join(alembic_dir, "env.py")
alembic_migrations_dir = os.path.join(alembic_dir, "versions")

# ripgrep resources
if platform.system() == "Windows":
    ripgrep_bin_path = os.path.join(project_root, "bin", "ripgrep", "rg.exe")
else:
    ripgrep_bin_path = os.path.join(project_root, "bin", "ripgrep", "rg")

# node resources
node_dir = os.path.join(project_root, "bin", "node")

# uv resources
uv_dir = os.path.join(project_root, "bin", "uv")

a = Analysis(
    ["entry.py"],
    pathex=[],
    binaries=[],
    datas=[
        (alembic_ini_path, "."),
        (alembic_env_path, "src/db/alembic"),
        (alembic_migrations_dir, "src/db/alembic/versions"),

        (ripgrep_bin_path, "bin/ripgrep"),
        (node_dir, "bin/node"),
        (uv_dir, "bin/uv"),

        *collect_data_files("magika", includes=["config/**", "models/**"]),
        *collect_data_files("binaryornot", includes=["data/**"]),
        *collect_data_files("trafilatura", includes=["settings.cfg"]),
    ],
    hiddenimports=[
        "aiosqlite",
        "sqlalchemy.dialects.sqlite.aiosqlite",
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
