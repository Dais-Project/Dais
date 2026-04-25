from sqlalchemy import select
from src.db.models import tasks as task_models
from .service_base import ServiceBase
from .exceptions import NotFoundError, ServiceErrorCode
from .utils import build_load_options, Relations


class RunRecordNotFoundError(NotFoundError):
    def __init__(self, run_record_id: int) -> None:
        super().__init__(ServiceErrorCode.RUN_RECORD_NOT_FOUND, "RunRecord", run_record_id)


class RunRecordService(ServiceBase):
    @staticmethod
    def relations() -> Relations:
        return [
            task_models.RunRecord.schedule,
        ]

    def get_run_records_query(self, schedule_id: int):
        return (
            select(task_models.RunRecord)
            .where(task_models.RunRecord.schedule_id == schedule_id)
            .order_by(task_models.RunRecord.id.desc())
        )

    async def get_run_record_by_id(self, id: int) -> task_models.RunRecord:
        run_record = await self._db_session.get(
            task_models.RunRecord,
            id,
            options=build_load_options(self.relations()),
        )
        if not run_record:
            raise RunRecordNotFoundError(id)
        return run_record
