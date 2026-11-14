import platform
import shutil
from pathlib import Path

from .common import PROJECT_ROOT


def _resolve_binary(name: str, bundled_path: Path) -> Path:
    installed_path = shutil.which(name)
    if installed_path is not None:
        # Keep symlink entry points intact (for example, npm and npx).
        return Path(installed_path).absolute()
    return bundled_path

_ext = ".exe" if platform.system() == "Windows" else ""

BINARY_DIR = PROJECT_ROOT / "bin"

RIPGREP_PATH = _resolve_binary("rg", BINARY_DIR / "ripgrep" / f"rg{_ext}")

NODE_PATH = _resolve_binary("node", BINARY_DIR / "node" / f"node{_ext}")
if platform.system() == "Windows":
    NPM_PATH = _resolve_binary("npm", BINARY_DIR / "node" / "npm.cmd")
    NPX_PATH = _resolve_binary("npx", BINARY_DIR / "node" / "npx.cmd")
else:
    NPM_PATH = _resolve_binary("npm", BINARY_DIR / "node" / "npm")
    NPX_PATH = _resolve_binary("npx", BINARY_DIR / "node" / "npx")

UV_PATH = _resolve_binary("uv", BINARY_DIR / "uv" / f"uv{_ext}")
UVX_PATH = _resolve_binary("uvx", BINARY_DIR / "uv" / f"uvx{_ext}")
