from datetime import datetime, timezone
from typing import Any, Callable, Coroutine
from apscheduler.jobstores.base import JobLookupError
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
    def create_job_id(schedule_id: int | str) -> JobId:
        return f"schedule:{schedule_id}"

    def _append_job(self, id: int | str, job: JobCallable, trigger: BaseTrigger, *args, **kwargs) -> JobId:
        job_id = Scheduler.create_job_id(id)
        self._scheduler.add_job(job,
                                id=job_id,
                                args=args,
                                kwargs=kwargs,
                                trigger=trigger,
                                max_instances=1,
                                replace_existing=True)
        return job_id

    def add_cron_job(self, id: int | str, job: JobCallable, expression: str, *args, **kwargs) -> JobId:
        trigger = CronTrigger.from_crontab(expression)
        return self._append_job(id, job, trigger, *args, **kwargs)

    def add_polling_job(self, id: int | str, job: JobCallable, interval_sec: int, *args, **kwargs) -> JobId:
        trigger = IntervalTrigger(seconds=interval_sec)
        return self._append_job(id, job, trigger, *args, **kwargs)

    def add_delayed_job(self, id: int | str, job: JobCallable, scheduled_at: int, *args, **kwargs) -> JobId:
        run_date = datetime.fromtimestamp(scheduled_at, tz=timezone.utc)
        trigger = DateTrigger(run_date=run_date)
        return self._append_job(id, job, trigger, *args, **kwargs)

    def pause_job(self, id: JobId):
        self._scheduler.pause_job(id)

    def resume_job(self, id: JobId):
        self._scheduler.resume_job(id)

    def remove_job(self, id: JobId, raise_when_missing: bool = True):
        try:
            self._scheduler.remove_job(id)
        except JobLookupError:
            if raise_when_missing:
                raise

    def start(self):
        self._scheduler.start()

    def shutdown(self):
        self._scheduler.shutdown()
