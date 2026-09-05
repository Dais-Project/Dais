import time

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from . import Base


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_digest: Mapped[str] = mapped_column(unique=True, index=True)
    created_at: Mapped[int] = mapped_column(default=lambda: int(time.time()))
    expires_at: Mapped[int] = mapped_column(index=True)
    user_agent: Mapped[str | None]
    remote_address: Mapped[str | None]
