from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from starlette.requests import Request


class DBSessionMiddleware(BaseHTTPMiddleware):
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

        if response.status_code >= 400:
            await session.rollback()
            return response

        try:
            await session.commit()
        except Exception:
            await session.rollback()
            raise

        return response
