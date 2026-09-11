import jwt
import pytest

from src.schemas.tasks import runtime as task_runtime_schemas
from src.services.task_resource_access import TaskResourceAccessInvalidError
from src.services.task_resource_access import TaskResourceAccessPayload
from src.services.task_resource_access import TaskResourceAccessService


@pytest.fixture
def access_service() -> TaskResourceAccessService:
    return TaskResourceAccessService(b"a" * 32)


@pytest.fixture
def payload() -> TaskResourceAccessPayload:
    return TaskResourceAccessPayload(
        task_type=task_runtime_schemas.TaskType.TASK,
        task_id=123,
        resource_id=456,
    )


def test_create_and_verify_token(
    access_service: TaskResourceAccessService,
    payload: TaskResourceAccessPayload,
):
    token = access_service.create_token(payload)

    assert access_service.verify_token(token) == payload
    assert jwt.get_unverified_header(token)["alg"] == "HS256"


@pytest.mark.parametrize(
    "mutate",
    [
        lambda token: f"x{token[1:]}",
        lambda token: f"{token[:-1]}x",
        lambda token: token.split(".")[0],
        lambda token: f"*.{'.'.join(token.split('.')[1:])}",
    ],
)
def test_rejects_malformed_or_tampered_token(
    access_service: TaskResourceAccessService,
    payload: TaskResourceAccessPayload,
    mutate,
):
    token = access_service.create_token(payload)

    with pytest.raises(TaskResourceAccessInvalidError):
        access_service.verify_token(mutate(token))


@pytest.mark.parametrize(
    "invalid_payload",
    [
        {
            "task_type": "task",
            "task_id": 123,
            "resource_id": 456,
            "unexpected": True,
        },
        {
            "task_type": "invalid",
            "task_id": 123,
            "resource_id": 456,
        },
        {
            "task_type": "task",
            "task_id": "123",
            "resource_id": 456,
        },
        {
            "task_type": "task",
            "task_id": 123,
            "resource_id": False,
        },
    ],
)
def test_rejects_invalid_payload(
    access_service: TaskResourceAccessService,
    invalid_payload: dict[str, object],
):
    token = jwt.encode(invalid_payload, b"a" * 32, algorithm="HS256")

    with pytest.raises(TaskResourceAccessInvalidError):
        access_service.verify_token(token)


def test_rejects_different_algorithm(access_service: TaskResourceAccessService):
    token = jwt.encode(
        {
            "task_type": "task",
            "task_id": 123,
            "resource_id": 456,
        },
        b"a" * 48,
        algorithm="HS384",
    )

    with pytest.raises(TaskResourceAccessInvalidError):
        access_service.verify_token(token)


def test_different_key_rejects_token(payload: TaskResourceAccessPayload):
    token = TaskResourceAccessService(b"a" * 32).create_token(payload)

    with pytest.raises(TaskResourceAccessInvalidError):
        TaskResourceAccessService(b"b" * 32).verify_token(token)
