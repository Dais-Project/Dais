import logo from "@shared/icon-square.png";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import {
  getGetTaskQueryKey,
  invalidateTaskQueries,
  useCreateTask,
  useSummarizeTaskTitle,
} from "@/api/task";
import { useTabsStore } from "@/stores/tabs-store";
import { toSdkMessage, uiUserMessageFactory } from "@/types/message";
import { DEFAULT_TAB_TITLE } from ".";
import { PromptInputDraft, PromptInputProvider, type PromptInputMessage } from "./components/PromptInput";
import { updateTaskTitle } from "@/features/resource/task-actions";

type CreateViewProps = {
  tabId: string;
  workspaceId: number;
};

export function CreateView({ tabId, workspaceId }: CreateViewProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const queryClient = useQueryClient();
  const updateTabMetadata = useTabsStore((state) => state.updateMetadata);

  const summarizeTaskTitleMutation = useSummarizeTaskTitle({
    mutation: {
      async onSuccess(taskRead) {
        updateTaskTitle(workspaceId, taskRead.id, taskRead.title);
      },
    },
  });
  const createTaskMutation = useCreateTask({
    mutation: {
      async onSuccess(taskRead) {
        summarizeTaskTitleMutation.mutate({ taskId: taskRead.id });
        await invalidateTaskQueries({ workspaceId });
        queryClient.removeQueries({
          queryKey: getGetTaskQueryKey(taskRead.id),
        });
        updateTabMetadata(tabId, {
          isDraft: false,
          id: taskRead.id,
          workspace_id: taskRead.workspace_id,
        });
      },
    },
  });

  const handleSubmit = (message: PromptInputMessage, agentId: number) => {
    const userMessage = uiUserMessageFactory(message.text);
    createTaskMutation.mutateAsync({
      data: {
        title: DEFAULT_TAB_TITLE,
        agent_id: agentId,
        workspace_id: workspaceId,
        messages: [toSdkMessage(userMessage)],
      },
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
