from typing import Annotated

from fastapi import Depends

from src.schemas.tasks import runtime as task_runtime_schemas
from src.services.tasks.resource import TaskResourceService
from src.services.tasks.schedule import RunRecordService, ScheduleService
from src.services.tasks.task import TaskService

from .db_session import DbSessionDep


def get_task_resource_service(
    db_session: DbSessionDep,
    task_type: task_runtime_schemas.TaskType,
) -> TaskResourceService:
    return TaskResourceService.from_db_session(db_session, task_type)


TaskResourceServiceDep = Annotated[
    TaskResourceService,
    Depends(get_task_resource_service),
]


def get_task_service(db_session: DbSessionDep) -> TaskService:
    return TaskService.from_db_session(db_session)


TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]


def get_schedule_service(db_session: DbSessionDep) -> ScheduleService:
    return ScheduleService.from_db_session(db_session)


ScheduleServiceDep = Annotated[ScheduleService, Depends(get_schedule_service)]


def get_run_record_service(db_session: DbSessionDep) -> RunRecordService:
    return RunRecordService.from_db_session(db_session)


RunRecordServiceDep = Annotated[
    RunRecordService,
    Depends(get_run_record_service),
]
