from datetime import datetime, timezone
from typing import Any, Callable, Coroutine
from apscheduler.job import BaseTrigger
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger


type JobId = str
type JobCallable = Callable[..., Coroutine[Any, Any, Any]]

class Scheduler:
    def __init__(self):
        self._scheduler = AsyncIOScheduler()

    @staticmethod
    def _schedule_job_id(schedule_id: int | str) -> JobId:
        return f"schedule:{schedule_id}"

    def _append_job(self, id: int | str, job: JobCallable, trigger: BaseTrigger) -> JobId:
        job_id = Scheduler._schedule_job_id(id)
        self._scheduler.add_job(job,
                                id=job_id,
                                trigger=trigger,
                                replace_existing=True)
        return job_id

    def add_cron_job(self, id: int | str, job: JobCallable, expression: str) -> JobId:
        trigger = CronTrigger.from_crontab(expression)
        return self._append_job(id, job, trigger)

    def add_polling_job(self, id: int | str, job: JobCallable, interval_sec: int) -> JobId:
        trigger = IntervalTrigger(seconds=interval_sec)
        return self._append_job(id, job, trigger)

    def add_delayed_job(self, id: int | str, job: JobCallable, run_at: int) -> JobId:
        run_date = datetime.fromtimestamp(run_at, tz=timezone.utc)
        trigger = DateTrigger(run_date=run_date)
        return self._append_job(id, job, trigger)

    def remove_job(self, id: JobId):
        self._scheduler.remove_job(id)

    def start(self):
        self._scheduler.start()

    def shutdown(self):
        self._scheduler.shutdown()
