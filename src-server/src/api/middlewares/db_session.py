from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from starlette.requests import Request

from src.db import AsyncSessionLocal


class DBSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ):
        # Creating AsyncSession does not acquire a database connection.
        # SQLAlchemy checks one out lazily only when the request performs database I/O.
        async with AsyncSessionLocal() as session:
            request.state.db_session = session
            try:
                response = await call_next(request)
            except Exception:
                await session.rollback()
                raise

            if response.status_code >= 400:
                await session.rollback()
                return response

            try:
                await session.commit()
            except Exception:
                await session.rollback()
                raise

            return response
