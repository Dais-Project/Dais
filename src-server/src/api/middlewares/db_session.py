from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

class DBSessionMiddleware(BaseHTTPMiddleware):
    _logger = logger.bind(name="DBSessionMiddleware")

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        try:
            response = await call_next(request)
        except Exception:
            session: AsyncSession | None = getattr(request.state, "db_session", None)
            if session is not None:
                await session.rollback()
            raise

        session = getattr(request.state, "db_session", None)
        if session is None:
            return response

        try:
            if response.status_code >= 400:
                await session.rollback()
            else:
                await session.commit()
        except Exception:
            await session.rollback()
            raise

        return response
