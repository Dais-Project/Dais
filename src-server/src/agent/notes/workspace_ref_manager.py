from collections import Counter


class WorkspaceRefManager:
    _workspace_refs: Counter[int] = Counter()

    @classmethod
    def increase_workspace_ref(cls, workspace_id: int):
        cls._workspace_refs[workspace_id] += 1

    @classmethod
    def decrease_workspace_ref(cls, workspace_id: int):
        current_count = cls._workspace_refs[workspace_id]
        cls._workspace_refs[workspace_id] = max(current_count - 1, 0)

    @classmethod
    def is_workspace_in_use(cls, workspace_id: int) -> bool:
        return cls._workspace_refs[workspace_id] > 0
