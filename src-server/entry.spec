# -*- mode: python ; coding: utf-8 -*-
import os
import litellm

litellm_path = os.path.dirname(litellm.__file__)
tokenizer_path = os.path.join(litellm_path, "litellm_core_utils", "tokenizers")

a = Analysis(
    ["entry.py"],
    pathex=[],
    binaries=[],
    datas=[(tokenizer_path, "litellm/litellm_core_utils/tokenizers")],
    hiddenimports=[],
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
