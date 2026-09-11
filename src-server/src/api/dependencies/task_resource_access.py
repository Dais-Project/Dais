from typing import Annotated

from fastapi import Depends

from src.services.task_resource_access import TaskResourceAccessService
from src.services.task_resource_access import use_task_resource_access_service


TaskResourceAccessServiceDep = Annotated[
    TaskResourceAccessService,
    Depends(use_task_resource_access_service),
]
