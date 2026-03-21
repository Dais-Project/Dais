import platform
from pathlib import Path

_current = Path(__file__).absolute()
_ext = ".exe" if platform.system() == "Windows" else ""

PROJECT_ROOT = _current.parent.parent.absolute()
RIPGREP_PATH = PROJECT_ROOT / "bin" / "ripgrep" / f"rg{_ext}"
