from . import DTOBase


class SkillResourceBase(DTOBase):
    relative: str
    content: str

class SkillResourceRead(SkillResourceBase):
    id: int

class SkillBase(DTOBase):
    name: str
    description: str = ""

class SkillBrief(SkillBase):
    id: int
    is_enabled: bool

class SkillRead(SkillBase):
    id: int
    content: str
    is_enabled: bool
    resources: list[SkillResourceRead]

class SkillCreate(SkillBase):
    is_enabled: bool = True
    content: str
    resources: list[SkillResourceBase]

class SkillUpdate(DTOBase):
    name: str | None = None
    description: str | None = None
    is_enabled: bool | None = None
    content: str | None = None
    resources: list[SkillResourceBase] | None = None
