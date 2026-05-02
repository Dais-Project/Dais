import { useAgentTaskState } from "../../hooks/use-agent-task";
import { ApproveAll } from "./ApproveAll";
import { ContinueTask } from "./ContinueTask";
import { ErrorRetry } from "./ErrorRetry";

export function SessionStates() {
  const { state, flags } = useAgentTaskState();

  if (state === "error") {
    return <ErrorRetry />;
  }
  if (flags.isFinished) {
    return null;
  }
  if (state === "idle") {
    if (flags.requiresUserPermission) {
      return <ApproveAll />
    }
    if (flags.requiresUserResponse) {
      return <ContinueTask />
    }
  }
  return null;
}
