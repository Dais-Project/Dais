import logo from "@shared/icon-square.png";
import { useQueryClient } from "@tanstack/react-query";
import type { TaskType, UserMessage } from "@/api/generated/schemas";
import {
  getGetTaskQueryKey,
  getGetTasksQueryKey,
  useNewTask,
} from "@/api/task";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { DEFAULT_TAB_TITLE } from ".";
import {
  PromptInputDraft,
  type PromptInputMessage,
} from "./components/PromptInput";

type CreateViewProps = {
  tabId: string;
  taskType: TaskType;
};

export function CreateView({ tabId, taskType }: CreateViewProps) {
  const queryClient = useQueryClient();
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const updateTabMetadata = useTabsStore((state) => state.updateTabMetadata);
  const createTaskMutation = useNewTask({
    mutation: {
      onSuccess: (taskRead) => {
        if (currentWorkspace) {
          queryClient.invalidateQueries({
            queryKey: getGetTasksQueryKey({
              workspace_id: currentWorkspace.id,
            }),
          });
        }
        queryClient.removeQueries({
          queryKey: getGetTaskQueryKey(taskRead.id),
        });
        updateTabMetadata(tabId, {
          isDraft: false,
          type: taskType,
          id: taskRead.id,
        });
      },
    },
  });

  const handleSubmit = (message: PromptInputMessage, agentId: number) => {
    if (!currentWorkspace) {
      throw new Error("No current workspace");
    }

    const userMessage: UserMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message.text,
    };

    createTaskMutation.mutateAsync({
      data: {
        type: taskType,
        title: DEFAULT_TAB_TITLE,
        agent_id: agentId,
        workspace_id: currentWorkspace.id,
        messages: [userMessage],
      },
    });
  };

  return (
    <div className="flex size-full flex-col items-center justify-center px-4">
      <div className="mb-12 flex flex-col items-center text-center">
        <div className="mb-6 overflow-hidden rounded-2xl shadow-sm ring-1 ring-primary/20">
          <img src={logo} alt="Logo" width="96" height="96" />
        </div>
        <h1 className="mb-2 font-bold text-4xl text-foreground tracking-tight">
          What can I help you with?
        </h1>
        <p className="text-lg text-muted-foreground">
          Start a new task with your AI agent.
        </p>
      </div>
      <PromptInputDraft taskType={taskType} onSubmit={handleSubmit} />
    </div>
  );
}
