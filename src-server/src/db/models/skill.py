from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from . import Base, relationship


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
    description: Mapped[str] = mapped_column(default="")
    is_enabled: Mapped[bool] = mapped_column(default=True)

    content: Mapped[str]
    resources: Mapped[list[SkillResource]] = relationship(back_populates="skill",
                                                          cascade="all, delete-orphan")
