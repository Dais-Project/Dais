import hashlib
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from . import Base, relationship
from .relationships import workspace_skill_association_table

if TYPE_CHECKING:
    from .workspace import Workspace


class SkillResource(Base):
    __tablename__ = "skill_resources"
    id: Mapped[int] = mapped_column(primary_key=True)
    relative: Mapped[str]
    content: Mapped[str]
    _skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"))
    skill: Mapped[Skill] = relationship(back_populates="resources",
                                        foreign_keys=[_skill_id],
                                        viewonly=True)

class Skill(Base):
    __tablename__ = "skills"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    hash: Mapped[str]
    description: Mapped[str] = mapped_column(default="")
    is_enabled: Mapped[bool] = mapped_column(default=True)

    content: Mapped[str]
    resources: Mapped[list[SkillResource]] = relationship(back_populates="skill",
                                                          cascade="all, delete-orphan")

    _workspaces: Mapped[list[Workspace]] = relationship(secondary=workspace_skill_association_table,
                                                        back_populates="usable_skills",
                                                        viewonly=True)

    @staticmethod
    def compute_resources_hash(resources: list[SkillResource]) -> str:
        h = hashlib.sha256()
        for r in sorted(resources, key=lambda r: r.relative):
            h.update(r.relative.encode("utf-8"))
            h.update(b"\0")
            h.update(r.content.encode("utf-8"))
        return h.hexdigest()

async def init(db_session: AsyncSession) -> None:
    import src.agent.skills.workspace_instruction_writer as workspace_instruction_writer_skill

    stmt = select(Skill.id).limit(1)
    exists = await db_session.scalar(stmt)
    if exists: return

    built_in_skills = [
        (workspace_instruction_writer_skill.NAME, workspace_instruction_writer_skill.DESCRIPTION, workspace_instruction_writer_skill.CONTENT),
    ]

    for name, description, content in built_in_skills:
        db_session.add(Skill(
            name=name,
            hash="",
            description=description,
            is_enabled=True,
            content=content,
            resources=[],
        ))

    await db_session.flush()
