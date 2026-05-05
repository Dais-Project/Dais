from fastapi import APIRouter, Query, status
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import apaginate
from src.agent.task.schedule_runner import use_schedule_runner
from src.db import DbSessionDep
from src.schemas.tasks import schedule as schedule_schemas
from src.services.tasks import RunRecordService, ScheduleService


schedule_manage_router = APIRouter(tags=["schedule"])

@schedule_manage_router.get("/runnings", response_model=list[schedule_schemas.ScheduleRunningJob])
async def get_schedule_running_jobs():
    return await use_schedule_runner().list_job_snapshots()

@schedule_manage_router.get("/", response_model=Page[schedule_schemas.ScheduleBrief])
async def get_schedules(db_session: DbSessionDep, workspace_id: int = Query(...)):
    query = ScheduleService(db_session).get_schedules_query(workspace_id)
    return await apaginate(db_session, query)

@schedule_manage_router.get("/{schedule_id}", response_model=schedule_schemas.ScheduleRead)
async def get_schedule(schedule_id: int, db_session: DbSessionDep):
    return await ScheduleService(db_session).get_schedule_by_id(schedule_id)

@schedule_manage_router.get("/{schedule_id}/records", response_model=Page[schedule_schemas.RunRecordBrief])
async def get_schedule_records(schedule_id: int, db_session: DbSessionDep):
    query = RunRecordService(db_session).get_run_records_query(schedule_id)
    return await apaginate(db_session, query)

@schedule_manage_router.post("/", status_code=status.HTTP_201_CREATED, response_model=schedule_schemas.ScheduleRead)
async def create_schedule(body: schedule_schemas.ScheduleCreate, db_session: DbSessionDep):
    created_schedule = await ScheduleService(db_session).create_schedule(body)
    schedule = schedule_schemas.ScheduleRead.model_validate(created_schedule)
    await use_schedule_runner().append(schedule)
    return schedule

@schedule_manage_router.patch("/{schedule_id}", response_model=schedule_schemas.ScheduleRead)
async def update_schedule(schedule_id: int, body: schedule_schemas.ScheduleUpdate, db_session: DbSessionDep):
    updated_schedule = await ScheduleService(db_session).update_schedule(schedule_id, body)
    if updated_schedule.is_enabled:
        schedule = schedule_schemas.ScheduleRead.model_validate(updated_schedule)
        await use_schedule_runner().append(schedule)
    else:
        use_schedule_runner().remove(updated_schedule.id)
    return updated_schedule

@schedule_manage_router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(schedule_id: int, db_session: DbSessionDep):
    use_schedule_runner().remove(schedule_id)
    await ScheduleService(db_session).delete_schedule(schedule_id)

# --- --- --- --- --- ---

@schedule_manage_router.post("/{schedule_id}/trigger", status_code=status.HTTP_202_ACCEPTED)
async def trigger_schedule(schedule_id: int):
    await use_schedule_runner().trigger(schedule_id)

@schedule_manage_router.delete("/records/{job_id}/execution", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_schedule_execution(job_id: int):
    await use_schedule_runner().cancel_job(job_id)

# --- --- --- --- --- ---

# Schedule record endpoints

@schedule_manage_router.get("/records/{run_record_id}", response_model=schedule_schemas.RunRecordRead)
async def get_run_record(run_record_id: int, db_session: DbSessionDep):
    return await RunRecordService(db_session).get_run_record_by_id(id=run_record_id)

@schedule_manage_router.delete("/records/{run_record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_run_record(run_record_id: int, db_session: DbSessionDep):
    await RunRecordService(db_session).delete_run_record(run_record_id)
