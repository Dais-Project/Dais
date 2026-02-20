from . import DTOBase
from ..db.models.provider import Provider, LlmProviders, LlmModelCapability

class LlmModelBase(DTOBase):
    name: str
    context_size: int
    capability: LlmModelCapability

class LlmModelRead(LlmModelBase):
    id: int

class LlmModelCreate(LlmModelBase): ...

class LlmModelUpdate(DTOBase):
    id: int
    name: str | None
    context_size: int | None
    capability: LlmModelCapability | None

# --- --- --- --- --- ---

class ProviderBase(DTOBase):
    name: str
    type: LlmProviders
    base_url: str
    api_key: str

class ProviderBrief(ProviderBase):
    id: int
    model_count: int

    @classmethod
    def from_provider(cls, provider: Provider) -> ProviderBrief:
        return cls(
            id=provider.id,
            name=provider.name,
            type=provider.type,
            base_url=provider.base_url,
            api_key=provider.api_key,
            model_count=len(provider.models),
        )

class ProviderRead(ProviderBase):
    id: int
    models: list[LlmModelRead]

class ProviderCreate(ProviderBase):
    models: list[LlmModelCreate]

class ProviderUpdate(DTOBase):
    name: str | None
    type: LlmProviders | None
    base_url: str | None
    api_key: str | None
    models: list[LlmModelUpdate | LlmModelCreate] | None
