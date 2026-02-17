from pydantic import BaseModel, ConfigDict

class DTOBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
