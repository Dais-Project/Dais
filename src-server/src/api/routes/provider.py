from typing import Annotated
from fastapi import APIRouter, Depends, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate
from ...services.provider import ProviderService
from ...schemas import provider as provider_schemas

providers_router = APIRouter(tags=["provider"])

def get_provider_service():
    with ProviderService() as service:
        yield service

ProviderServiceDep = Annotated[ProviderService, Depends(get_provider_service)]

@providers_router.get("/", response_model=Page[provider_schemas.ProviderRead])
def get_providers(service: ProviderServiceDep):
    query = service.get_providers_query()
    return paginate(service.db_session, query)

@providers_router.get("/brief", response_model=list[provider_schemas.ProviderBrief])
def get_provider_brief(service: ProviderServiceDep):
    providers = service.get_providers()
    return [provider_schemas.ProviderBrief.from_provider(provider)
            for provider in providers]

@providers_router.get("/{provider_id}", response_model=provider_schemas.ProviderRead)
def get_provider(provider_id: int, service: ProviderServiceDep):
    provider = service.get_provider_by_id(provider_id)
    return provider_schemas.ProviderRead.model_validate(provider)

@providers_router.post("/", status_code=status.HTTP_201_CREATED, response_model=provider_schemas.ProviderRead)
def create_provider(
    body: provider_schemas.ProviderCreate,
    service: ProviderServiceDep,
):
    new_provider = service.create_provider(body)
    return provider_schemas.ProviderRead.model_validate(new_provider)

@providers_router.put("/{provider_id}", response_model=provider_schemas.ProviderRead)
def update_provider(
    provider_id: int,
    body: provider_schemas.ProviderUpdate,
    service: ProviderServiceDep,
):
    updated_provider = service.update_provider(provider_id, body)
    return provider_schemas.ProviderRead.model_validate(updated_provider)

@providers_router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_provider(provider_id: int, service: ProviderServiceDep):
    service.delete_provider(provider_id)
