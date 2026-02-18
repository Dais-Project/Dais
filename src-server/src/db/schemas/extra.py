from typing import TypeAliasType
from ...agent.tool import BuiltInTools

EXTRA_SCHEMA_TYPES: list[type | TypeAliasType] = [
    BuiltInTools,
]
