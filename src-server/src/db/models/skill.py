import hashlib
from sqlalchemy import ForeignKey, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column
from . import Base, relationship


class SkillResource(Base):
    __tablename__ = "skill_resources"
    id: Mapped[int] = mapped_column(primary_key=True)
    relative: Mapped[str]
    content: Mapped[str]
    _skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"))

class Skill(Base):
    __tablename__ = "skills"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    hash: Mapped[str]
    description: Mapped[str] = mapped_column(default="")
    is_enabled: Mapped[bool] = mapped_column(default=True)

    content: Mapped[str]
    resources: Mapped[list[SkillResource]] = relationship(foreign_keys=[SkillResource._skill_id], cascade="all, delete-orphan")

    @staticmethod
    def compute_resources_hash(resources: list[SkillResource]) -> str:
        h = hashlib.sha256()
        for r in sorted(resources, key=lambda r: r.relative):
            h.update(r.relative.encode("utf-8"))
            h.update(b"\0")
            h.update(r.content.encode("utf-8"))
        return h.hexdigest()

async def init(db_session: AsyncSession) -> None:
    from typing import Protocol
    from src.agent.skills.builtin_skills import (
        skill_writer as skill_writer_skill,
        workspace_instruction_writer as workspace_instruction_writer_skill,
    )

    stmt = select(Skill.id).limit(1)
    exists = await db_session.scalar(stmt)
    if exists: return

    class BuiltInSkill(Protocol):
        NAME: str
        DESCRIPTION: str
        CONTENT: str

    builtin_skills: list[BuiltInSkill] = [
        skill_writer_skill,
        workspace_instruction_writer_skill,
    ]

    for skill in builtin_skills:
        db_session.add(Skill(
            name=skill.NAME,
            hash="",
            description=skill.DESCRIPTION,
            is_enabled=True,
            content=skill.CONTENT,
            resources=[],
        ))

    await db_session.flush()
