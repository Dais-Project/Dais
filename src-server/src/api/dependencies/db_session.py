from typing import Annotated, AsyncIterator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import AsyncSessionLocal
from src.services.resource_events import ResourceEventCollector


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        request.state.db_session = session
        request.state.resource_event_collector = ResourceEventCollector()
        yield session


type DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
