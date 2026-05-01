from typing import Protocol
from sqlalchemy import Index, and_
from sqlalchemy.orm import Mapped, declared_attr, foreign, mapped_column
from .shared import TaskResourceOwnerType
from .. import Base, relationship


class TaskResource(Base):
    __tablename__ = "task_resources"
    __table_args__ = (
        Index("ix_task_resources_owner", "owner_type", "owner_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str]
    checksum: Mapped[str]

    owner_type: Mapped[TaskResourceOwnerType]
    owner_id: Mapped[int]


class _DbTable(Protocol):
    __tablename__: str
    id: Mapped[int]

class HasResources:
    @declared_attr
    def resources(cls: type[_DbTable]) -> Mapped[list[TaskResource]]:
        owner_type_val = cls.__tablename__
        return relationship(
            "TaskResource",
            primaryjoin=and_(
                TaskResource.owner_type == owner_type_val,
                foreign(TaskResource.owner_id) == cls.id,
            ),
            foreign_keys=[TaskResource.owner_id],
            cascade="all, delete-orphan",
            overlaps="resources",
            single_parent=True,
        )
