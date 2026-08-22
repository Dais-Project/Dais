from fastapi import APIRouter
from fastapi import Query
from fastapi import status
from fastapi_pagination import Page

from src.agent.task.schedule_runner import use_schedule_runner
from src.schemas.tasks import schedule as schedule_schemas

from ...dependencies import RunRecordServiceDep
from ...dependencies import ScheduleServiceDep


schedule_manage_router = APIRouter(tags=["schedule"])


@schedule_manage_router.get("/runnings", response_model=list[schedule_schemas.ScheduleRunningJob])
async def get_schedule_running_jobs():
    return await use_schedule_runner().list_job_snapshots()

@schedule_manage_router.get("/", response_model=Page[schedule_schemas.ScheduleBrief])
async def get_schedules(service: ScheduleServiceDep,
                        workspace_id: int = Query(...),
                        query: str | None = Query(default=None)):
    return await service.get_page(workspace_id, query)

@schedule_manage_router.get("/records", response_model=Page[schedule_schemas.RunRecordAllBrief])
async def get_all_run_records(service: RunRecordServiceDep):
    return await service.get_all_page()

@schedule_manage_router.get("/{schedule_id}", response_model=schedule_schemas.ScheduleRead)
async def get_schedule(schedule_id: int, service: ScheduleServiceDep):
    return await service.get_by_id(schedule_id)

@schedule_manage_router.get("/{schedule_id}/records", response_model=Page[schedule_schemas.RunRecordBrief])
async def get_schedule_records(service: RunRecordServiceDep, schedule_id: int):
    return await service.get_page(schedule_id)

@schedule_manage_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=schedule_schemas.ScheduleRead,
)
async def create_schedule(service: ScheduleServiceDep, body: schedule_schemas.ScheduleCreate):
    return await service.create(body)

@schedule_manage_router.patch("/{schedule_id}", response_model=schedule_schemas.ScheduleRead)
async def update_schedule(service: ScheduleServiceDep,
                          schedule_id: int,
                          body: schedule_schemas.ScheduleUpdate):
    return await service.update(schedule_id, body)

@schedule_manage_router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT,)
async def delete_schedule(service: ScheduleServiceDep, schedule_id: int):
    await service.delete(schedule_id)

@schedule_manage_router.post("/{schedule_id}/trigger", status_code=status.HTTP_202_ACCEPTED)
async def trigger_schedule(schedule_id: int):
    await use_schedule_runner().trigger(schedule_id)

@schedule_manage_router.delete("/records/{job_id}/execution", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_schedule_execution(job_id: int):
    await use_schedule_runner().cancel_job(job_id)

@schedule_manage_router.get("/records/{run_record_id}", response_model=schedule_schemas.RunRecordRead)
async def get_run_record(service: RunRecordServiceDep, run_record_id: int):
    return await service.get_by_id(run_record_id)

@schedule_manage_router.delete("/records/{run_record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_run_record(service: RunRecordServiceDep, run_record_id: int):
    await service.delete(run_record_id)
