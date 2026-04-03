from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from . import Base


class MarkdownCache(Base):
    __tablename__ = "markdown_caches"
    id: Mapped[int] = mapped_column(primary_key=True)
    hash: Mapped[str]

    # the converted markdown content
    content: Mapped[str]

    # the path of source file, should be posix relative path
    source_path: Mapped[str]

    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"))
