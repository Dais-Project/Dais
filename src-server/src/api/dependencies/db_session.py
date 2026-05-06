from typing import Annotated, AsyncIterator
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from src.db import AsyncSessionLocal

async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        request.state.db_session = session
        yield session

type DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
