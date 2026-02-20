import dataclasses
from pydantic import TypeAdapter
from sqlalchemy import JSON
from sqlalchemy.types import TypeDecorator

class PydanticJSON(TypeDecorator):
    impl = JSON

    def __init__(self, adapter: TypeAdapter):
        super().__init__()
        self.adapter = adapter

    def process_bind_param(self, value, dialect):
        if value is None: return None
        return self.adapter.dump_python(value, mode="json")

    def process_result_value(self, value, dialect):
        if value is None: return None
        return self.adapter.validate_python(value)

class DataClassJSON(TypeDecorator):
    impl = JSON
    cache_ok = True

    def __init__(self, dataclass_type):
        super().__init__()
        self.dataclass_type = dataclass_type

    def process_bind_param(self, value, dialect):
        if value is None: return None
        if isinstance(value, dict):
            return value
        if isinstance(value, self.dataclass_type):
            return dataclasses.asdict(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return self.dataclass_type(**value)
        return value

class DataclassListJSON(TypeDecorator):
    impl = JSON
    cache_ok = True

    def __init__(self, dataclass_type):
        self.dataclass_type = dataclass_type
        super().__init__()

    def process_bind_param(self, value, dialect):
        if value is not None:
            return [dataclasses.asdict(item) for item in value]
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return [self.dataclass_type(**item) for item in value]
        return value
