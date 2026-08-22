from fastapi import APIRouter
from fastapi import status
from fastapi_pagination import Page

from src.schemas import provider as provider_schemas

from ..dependencies import ProviderServiceDep


providers_router = APIRouter(tags=["provider"])

@providers_router.get("/", response_model=Page[provider_schemas.ProviderRead])
async def get_providers(service: ProviderServiceDep):
    return await service.get_providers_page()

@providers_router.get("/brief", response_model=list[provider_schemas.ProviderBrief])
async def get_providers_brief(service: ProviderServiceDep):
    providers = await service.get_providers()
    return [provider_schemas.ProviderBrief.from_provider(item) for item in providers]

@providers_router.get("/{provider_id}", response_model=provider_schemas.ProviderRead)
async def get_provider(service: ProviderServiceDep, provider_id: int):
    return await service.get_provider_by_id(provider_id)

@providers_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=provider_schemas.ProviderRead,
)
async def create_provider(service: ProviderServiceDep, body: provider_schemas.ProviderCreate):
    return await service.create_provider(body)

@providers_router.put("/{provider_id}", response_model=provider_schemas.ProviderRead)
async def update_provider(
    service: ProviderServiceDep,
    provider_id: int,
    body: provider_schemas.ProviderUpdate,
):
    return await service.update_provider(provider_id, body)

@providers_router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(service: ProviderServiceDep, provider_id: int):
    await service.delete_provider(provider_id)
