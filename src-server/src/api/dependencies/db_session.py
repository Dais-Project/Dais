from typing import Annotated, AsyncIterator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    session: AsyncSession | None = getattr(request.state, "db_session", None)
    if session is None:
        raise RuntimeError("DBSessionMiddleware is not configured")
    yield session


type DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
