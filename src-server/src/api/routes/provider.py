from fastapi import APIRouter, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate
from ...db import DbSessionDep
from ...services.provider import ProviderService
from ...schemas import provider as provider_schemas

providers_router = APIRouter(tags=["provider"])


@providers_router.get("/", response_model=Page[provider_schemas.ProviderRead])
async def get_providers(db_session: DbSessionDep):
    query = ProviderService(db_session).get_providers_query()
    return await apaginate(db_session, query)

@providers_router.get("/brief", response_model=list[provider_schemas.ProviderBrief])
async def get_providers_brief(db_session: DbSessionDep):
    providers = await ProviderService(db_session).get_providers()
    return [provider_schemas.ProviderBrief.from_provider(provider) for provider in providers]

@providers_router.get("/{provider_id}", response_model=provider_schemas.ProviderRead)
async def get_provider(provider_id: int, db_session: DbSessionDep):
    provider = await ProviderService(db_session).get_provider_by_id(provider_id)
    return provider_schemas.ProviderRead.model_validate(provider)

@providers_router.post("/", status_code=status.HTTP_201_CREATED, response_model=provider_schemas.ProviderRead)
async def create_provider(body: provider_schemas.ProviderCreate, db_session: DbSessionDep):
    new_provider = await ProviderService(db_session).create_provider(body)
    return provider_schemas.ProviderRead.model_validate(new_provider)

@providers_router.put("/{provider_id}", response_model=provider_schemas.ProviderRead)
async def update_provider(
    provider_id: int,
    body: provider_schemas.ProviderUpdate,
    db_session: DbSessionDep,
):
    updated_provider = await ProviderService(db_session).update_provider(provider_id, body)
    return provider_schemas.ProviderRead.model_validate(updated_provider)

@providers_router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(provider_id: int, db_session: DbSessionDep):
    await ProviderService(db_session).delete_provider(provider_id)
