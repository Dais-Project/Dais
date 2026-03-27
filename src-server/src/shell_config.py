from .common import DATA_DIR

SHELL_CACHE_DIR = DATA_DIR / "shell-cache"
EMBEDDED_BINARIES_ENV = {
    "npm_config_cache": str(SHELL_CACHE_DIR / "npm"),
    "UV_CACHE_DIR": str(SHELL_CACHE_DIR / "uv"),
    "UV_TOOL_DIR": str(SHELL_CACHE_DIR / "uv-tools"),
}
