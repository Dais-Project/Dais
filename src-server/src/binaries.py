import platform
from .common import PROJECT_ROOT

_ext = ".exe" if platform.system() == "Windows" else ""

BINARY_DIR = PROJECT_ROOT / "bin"

RIPGREP_PATH = BINARY_DIR / "ripgrep" / f"rg{_ext}"

NODE_PATH = BINARY_DIR / "node" / f"node{_ext}"
if platform.system() == "Windows":
    NPM_PATH = BINARY_DIR / "node" / "npm.cmd"
    NPX_PATH = BINARY_DIR / "node" / "npx.cmd"
else:
    NPM_PATH = BINARY_DIR / "node" / f"npm"
    NPX_PATH = BINARY_DIR / "node" / f"npx"

UV_PATH = BINARY_DIR / "uv" / f"uv{_ext}"
UVX_PATH = BINARY_DIR / "uv" / f"uvx{_ext}"
