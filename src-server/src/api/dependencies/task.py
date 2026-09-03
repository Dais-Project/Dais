from typing import Annotated

from fastapi import Depends

from src.repositories.tasks.schedule import ScheduleRepository
from src.repositories.tasks.task import TaskRepository
from src.schemas.tasks import runtime as task_runtime_schemas
from src.services.tasks.resource import TaskResourceService
from src.services.tasks.schedule import RunRecordService, ScheduleService
from src.services.tasks.task import TaskService

from .db_session import DbSessionDep
from .resource_events import ResourceEventHandlerDep


def get_task_resource_service(
    db_session: DbSessionDep,
    task_type: task_runtime_schemas.TaskType,
) -> TaskResourceService:
    return TaskResourceService.from_db_session(db_session, task_type)


TaskResourceServiceDep = Annotated[
    TaskResourceService,
    Depends(get_task_resource_service),
]


def get_task_service(
    db_session: DbSessionDep,
    on_resource_changed: ResourceEventHandlerDep,
) -> TaskService:
    resource_service = TaskResourceService.from_db_session(
        db_session,
        task_runtime_schemas.TaskType.TASK,
    )
    return TaskService(
        TaskRepository(db_session),
        resource_service,
        on_resource_changed,
    )


TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]


def get_schedule_service(
    db_session: DbSessionDep,
    on_resource_changed: ResourceEventHandlerDep,
) -> ScheduleService:
    return ScheduleService(
        ScheduleRepository(db_session),
        on_resource_changed,
    )


ScheduleServiceDep = Annotated[ScheduleService, Depends(get_schedule_service)]


def get_run_record_service(db_session: DbSessionDep) -> RunRecordService:
    return RunRecordService.from_db_session(db_session)


RunRecordServiceDep = Annotated[
    RunRecordService,
    Depends(get_run_record_service),
]
