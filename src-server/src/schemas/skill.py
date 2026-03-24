from . import DTOBase


class SkillResourceBase(DTOBase):
    relative: str
    content: str

class SkillResourceRead(SkillResourceBase):
    id: int

class SkillBase(DTOBase):
    name: str
    description: str = ""
    is_enabled: bool = True
    content: str

class SkillRead(SkillBase):
    id: int
    resources: list[SkillResourceRead]

class SkillCreate(SkillBase):
    resources: list[SkillResourceBase] = []

class SkillUpdate(DTOBase):
    name: str | None = None
    description: str | None = None
    is_enabled: bool | None = None
    content: str | None = None
    resources: list[SkillResourceBase] | None = None
