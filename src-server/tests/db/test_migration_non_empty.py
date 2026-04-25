import pytest
from sqlalchemy import text


@pytest.mark.integration
def test_upgrade_non_empty_database_to_fa7f7ef37e5e(alembic_runner, alembic_engine) -> None:
    alembic_runner.migrate_up_before("fa7f7ef37e5e")

    with alembic_engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO workspaces (id, name, directory, instruction)
                VALUES (:id, :name, :directory, :instruction)
                """
            ),
            {
                "id": 1,
                "name": "workspace-a",
                "directory": "/tmp/workspace-a",
                "instruction": "instruction-a",
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO tasks (id, title, usage, messages, last_run_at, agent_id, _workspace_id)
                VALUES (:id, :title, :usage, :messages, :last_run_at, :agent_id, :workspace_id)
                """
            ),
            {
                "id": 1,
                "title": "task-a",
                "usage": "{}",
                "messages": "[]",
                "last_run_at": 0,
                "agent_id": None,
                "workspace_id": 1,
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO task_resources (filename, checksum, _task_id)
                VALUES (:filename, :checksum, :task_id)
                """
            ),
            {
                "filename": "seed.txt",
                "checksum": "seed-checksum",
                "task_id": 1,
            },
        )

    alembic_runner.migrate_up_one()

    with alembic_engine.connect() as conn:
        current_revision = conn.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one()
        migrated_row = conn.execute(
            text(
                """
                SELECT owner_type, owner_id, filename, checksum
                FROM task_resources
                LIMIT 1
                """
            )
        ).one()

    assert current_revision == "fa7f7ef37e5e"
    assert migrated_row.owner_type == "tasks"
    assert migrated_row.owner_id == 1
    assert migrated_row.filename == "seed.txt"
    assert migrated_row.checksum == "seed-checksum"


@pytest.mark.integration
def test_upgrade_empty_database_to_812b93ec54d5(alembic_runner, alembic_engine) -> None:
    alembic_runner.migrate_up_before("812b93ec54d5")
    alembic_runner.migrate_up_one()

    with alembic_engine.connect() as conn:
        current_revision = conn.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one()
        table_rows = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type = 'table'")
        ).all()

    table_names = {row.name for row in table_rows}

    assert current_revision == "812b93ec54d5"
    assert {
        "providers",
        "toolsets",
        "workspaces",
        "llm_models",
        "tools",
        "agents",
        "tasks",
        "workspace_agent_association",
    }.issubset(table_names)
