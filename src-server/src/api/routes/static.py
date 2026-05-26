import httpx
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, status
from starlette.responses import FileResponse, Response
from src.common import STATIC_DIR
from ..cleanup import CleanupManager


static_router = APIRouter(tags=["static"])
_PROXY_CLIENT = httpx.AsyncClient(follow_redirects=True)
_FRONTEND_DEV_URL = "http://localhost:1420"
_HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-encoding",
    "content-length",
    "host",
}

CleanupManager.add_cleanup(_PROXY_CLIENT.aclose)

def _resolve_static_file(static_root: Path, request_path: str) -> Path:
    normalized_path = request_path.strip("/")
    candidate = (static_root / normalized_path).resolve()

    try:
        candidate.relative_to(static_root)
    except ValueError:
        return static_root / "index.html"

    if candidate.is_dir():
        index_file = candidate / "index.html"
        if index_file.is_file():
            return index_file

    if candidate.is_file():
        return candidate

    return static_root / "index.html"

async def _proxy_to_frontend_dev_server(request: Request, request_path: str) -> Response:
    target_url = httpx.URL(_FRONTEND_DEV_URL).join(request_path or "/")
    if request.url.query:
        target_url = target_url.copy_with(query=request.url.query.encode("utf-8"))

    request_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in _HOP_BY_HOP_HEADERS
    }

    upstream_response = await _PROXY_CLIENT.request(
        request.method,
        target_url,
        content=await request.body(),
        headers=request_headers,
    )

    response_headers = {
        key: value
        for key, value in upstream_response.headers.items()
        if key.lower() not in _HOP_BY_HOP_HEADERS
    }

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=response_headers,
        media_type=upstream_response.headers.get("content-type"),
    )

@static_router.api_route("/", methods=["GET", "HEAD"])
@static_router.api_route("/{request_path:path}", methods=["GET", "HEAD"])
async def get_static_content(request: Request, request_path: str = "") -> Response:
    if request_path == "api" or request_path.startswith("api/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if STATIC_DIR is None:
        return await _proxy_to_frontend_dev_server(request, request_path)

    static_file = _resolve_static_file(STATIC_DIR, request_path)
    return FileResponse(static_file)
