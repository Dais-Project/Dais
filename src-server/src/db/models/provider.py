import dataclasses
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, select
from sqlalchemy.orm import Session, Mapped, mapped_column, relationship
from sqlalchemy.ext.hybrid import hybrid_property
from dais_sdk import LlmProviders
from . import Base
from .utils import DataClassJSON

if TYPE_CHECKING:
    from .agent import Agent

@dataclasses.dataclass
class LlmModelCapability:
    vision: bool = False
    reasoning: bool = False
    tool_use: bool = False

class LlmModel(Base):
    __tablename__ = "llm_models"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    context_size: Mapped[int]
    capability: Mapped[LlmModelCapability] = mapped_column(DataClassJSON(LlmModelCapability))

    _provider_id: Mapped[int] = mapped_column(ForeignKey("providers.id"))
    @hybrid_property
    def provider_id(self) -> int: return self._provider_id
    provider: Mapped[Provider] = relationship(back_populates="models",
                                              viewonly=True)
    agents: Mapped[list[Agent]] = relationship(back_populates="_model",
                                               viewonly=True)

class Provider(Base):
    __tablename__ = "providers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    type: Mapped[LlmProviders]
    base_url: Mapped[str]
    api_key: Mapped[str]
    models: Mapped[list[LlmModel]] = relationship(back_populates="provider",
                                                  cascade="all, delete-orphan")

def init(session: Session):
    default_provider = Provider(
        name="OpenAI",
        type=LlmProviders.OPENAI,
        base_url="https://api.openai.com/v1",
        api_key="sk-",
        models=[
            LlmModel(
                name="gpt-5",
                context_size=128_000,
                capability=LlmModelCapability())])

    stmt = select(Provider)
    exists = session.execute(stmt).scalars().first()
    if exists: return

    try:
        session.add(default_provider)
        session.commit()
    except Exception as e:
        session.rollback()
        raise e
