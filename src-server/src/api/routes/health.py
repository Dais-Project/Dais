from typing import Literal
from fastapi import APIRouter
from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: Literal["ok"]

health_router = APIRouter(tags=["health"])

@health_router.get("/", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    return HealthResponse(status="ok")
