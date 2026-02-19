import threading
from pydantic._internal._model_construction import ModelMetaclass

class Singleton(type):
    _instances: dict[type, object] = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class SingletonSync(Singleton):
    _locks: dict[type, threading.Lock] = {}
    _meta_lock: threading.Lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._locks:
            cls._locks[cls] = threading.Lock()
        with cls._locks[cls]:
            return super().__call__(*args, **kwargs)

class SingletonModel(ModelMetaclass, Singleton): ...
class SingletonModelSync(ModelMetaclass, SingletonSync): ...
