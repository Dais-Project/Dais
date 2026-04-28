import logo from "@shared/icon-square.png";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import {
  invalidateTaskQueries,
  useAppendTaskMessage,
  useCreateTask,
  useSummarizeTaskTitle,
} from "@/api/tasks";
import { useTabsStore } from "@/stores/tabs-store";
import { updateTaskTitle } from "@/features/resource/task-actions";
import { toSdkMessage, uiUserMessageFactory } from "@/types/message";
import { PromptInputDraft, PromptInputProvider, type PromptInputMessage } from "../components/PromptInput";

type TaskDraftViewProps = {
  tabId: string;
  workspaceId: number;
};

export function TaskDraftView({ tabId, workspaceId }: TaskDraftViewProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const updateTabMetadata = useTabsStore((state) => state.updateMetadata);

  const summarizeTaskTitleMutation = useSummarizeTaskTitle({
    mutation: {
      async onSuccess(taskRead) {
        updateTaskTitle(workspaceId, taskRead.id, taskRead.title);
      },
    },
  });
  const appendMessageMutation = useAppendTaskMessage({
    mutation: {
      async onSuccess(runtimeContext) {
        updateTabMetadata(tabId, {
          type: "task",
          isDraft: false,
          id: runtimeContext.id,
          workspace_id: runtimeContext.workspace_id,
        });
        summarizeTaskTitleMutation.mutate({ taskId: runtimeContext.id });
      }
    }
  });
  const createTaskMutation = useCreateTask({
    mutation: {
      async onSuccess() {
        await invalidateTaskQueries({ workspaceId });
      },
    },
  });

  const handleSubmit = async (message: PromptInputMessage, agentId: number) => {
    const taskRead = await createTaskMutation.mutateAsync({
      data: {
        title: t("tab.default_title"),
        agent_id: agentId,
        workspace_id: workspaceId,
      },
    });
    const userMessage = uiUserMessageFactory(message.text);
    const body = JSON.stringify({
      message: toSdkMessage(userMessage),
      agent_id: agentId,
    });
    await appendMessageMutation.mutateAsync({
      taskId: taskRead.id,
      taskType: "task",
      data: { body, uploaded_files: message.files.map((file) => file.raw) },
    });
  };

  return (
    <div className="flex size-full flex-col items-center justify-center px-4">
      <div className="mb-12 flex flex-col items-center text-center">
        <div className="mb-6 overflow-hidden rounded-2xl shadow-sm ring-1 ring-primary/20">
          <img src={logo} alt={t("create.logo_alt")} width="96" height="96" />
        </div>
        <h1 className="mb-2 font-bold text-4xl text-foreground tracking-tight">{t("create.title")}</h1>
        <p className="text-lg text-muted-foreground">{t("create.description")}</p>
      </div>
      <PromptInputProvider>
        <PromptInputDraft workspaceId={workspaceId} onSubmit={handleSubmit} />
      </PromptInputProvider>
    </div>
  );
}
