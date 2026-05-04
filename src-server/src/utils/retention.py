import time
from typing import Literal


# Unit: day
type RetentionOption = Literal["disabled", 7, 14, 30, 60, 180, 360]

SECONDS_PER_DAY = 24 * 60 * 60

def get_retention_cutoff(retention: RetentionOption, now: int | float | None = None) -> int | None:
    """
    Returns the cutoff timestamp that items after the timestamp should be retented
    """
    now = int(now or time.time())
    if retention == "disabled":
        return None
    return now - retention * SECONDS_PER_DAY
