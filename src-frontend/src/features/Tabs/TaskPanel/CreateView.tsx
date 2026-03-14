import logo from "@shared/icon-square.png";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
import { getGetTaskQueryKey, invalidateTaskQueries, useCreateTask } from "@/api/task";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { toSdkMessage, uiUserMessageFactory } from "@/types/message";
import { DEFAULT_TAB_TITLE } from ".";
import { PromptInputDraft, PromptInputProvider, type PromptInputMessage } from "./components/PromptInput";

export function CreateView({ tabId }: { tabId: string }) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const queryClient = useQueryClient();
  const currentWorkspace = useWorkspaceStore((state) => state.current);
  const updateTabMetadata = useTabsStore((state) => state.updateMetadata);
  const createTaskMutation = useCreateTask({
    mutation: {
      async onSuccess(taskRead) {
        if (currentWorkspace) {
          await invalidateTaskQueries({ workspaceId: currentWorkspace.id });
        }
        queryClient.removeQueries({
          queryKey: getGetTaskQueryKey(taskRead.id),
        });
        updateTabMetadata(tabId, {
          isDraft: false,
          id: taskRead.id,
        });
      },
    },
  });

  const handleSubmit = (message: PromptInputMessage, agentId: number) => {
    if (!currentWorkspace) {
      throw new Error("No current workspace");
    }

    const userMessage = uiUserMessageFactory(message.text);
    createTaskMutation.mutateAsync({
      data: {
        title: DEFAULT_TAB_TITLE,
        agent_id: agentId,
        workspace_id: currentWorkspace.id,
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
        <PromptInputDraft onSubmit={handleSubmit} />
      </PromptInputProvider>
    </div>
  );
}
