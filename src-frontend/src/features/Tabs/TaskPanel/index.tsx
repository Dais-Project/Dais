import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, useEffect, useState } from "react";
import { useImmer } from "use-immer";
import { createTask, fetchTaskById } from "@/api/task";
import { useTabsStore } from "@/stores/tabs-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { UserMessage } from "@/types/message";
import type { TaskTabMetadata } from "@/types/tab";
import type { TaskRead } from "@/types/task";
import type { TabPanelProps } from "../index";
import { ContinueTask } from "./ContinueTask";
import { PromptInput, type PromptInputMessage } from "./PromptInput";
import { TaskConversation } from "./TaskConversation";
import { type TaskRunner, useTaskRunner } from "./use-task-runner";

export const DEFAULT_TAB_TITLE = "New task";

export function TaskPanel({ tabId, metadata }: TabPanelProps<TaskTabMetadata>) {
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const updateTabMetadata = useTabsStore((state) => state.updateTabMetadata);
  const [taskData, setTaskData] = useImmer<TaskRead | null>(null);
  const [showContinueTask, setShowContinueTask] = useState(false);
  const taskRunner = useTaskRunner(setTaskData, (_) => {
    setShowContinueTask(true);
  });

  const queryClient = useQueryClient();
  const { data: taskQueryData, isLoading: taskLoading } = useQuery({
    queryKey: metadata.isDraft ? ["task", "draft"] : ["task", metadata.id],
    enabled: !metadata.isDraft,
    queryFn: () => {
      if (metadata.isDraft) {
        return null;
      }
      return fetchTaskById(metadata.id);
    },
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: (taskRead) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      updateTabMetadata(tabId, {
        isDraft: false,
        type: metadata.type,
        id: taskRead.id,
      });
      setTaskData(taskRead);
    },
  });

  useEffect(() => {
    if (!taskQueryData) {
      return;
    }
    setTaskData(taskQueryData);
    if (!(metadata.isDraft || taskRunner.state !== "idle")) {
      const lastMessage = taskQueryData.messages.at(-1);
      if (lastMessage) {
        const isAssistantMessage = lastMessage.role === "assistant";
        const isFinishTaskTool =
          lastMessage.role === "tool" && lastMessage.name === "finish_task";
        if (!(isAssistantMessage || isFinishTaskTool)) {
          setShowContinueTask(true);
        }
      }
    }
  }, [taskQueryData]);

  const handleSubmit = async (message: PromptInputMessage, agentId: number) => {
    if (!currentWorkspace) {
      throw new Error("No current workspace");
    }

    const userMessage: UserMessage = {
      role: "user",
      content: message.text,
    };

    if (metadata.isDraft) {
      const newTask = await createTaskMutation.mutateAsync({
        type: metadata.type,
        title: DEFAULT_TAB_TITLE,
        agent_id: agentId,
        workspace_id: currentWorkspace.id,
        messages: [userMessage],
      });
      taskRunner.continue(newTask.id, null);
    } else {
      setShowContinueTask(false);
      taskRunner.continue(metadata.id, userMessage);
    }
  };

  const handleContinueTask = () => {
    if (metadata.isDraft) {
      return;
    }
    setShowContinueTask(false);
    taskRunner.continue(metadata.id, null);
  };

  const handleCustomToolAction = (
    ...args: Parameters<TaskRunner["handleCustomToolAction"]>
  ) => {
    if (metadata.isDraft) {
      return;
    }
    setShowContinueTask(false);
    taskRunner.handleCustomToolAction(...args);
    const [toolMessageId, _, data] = args;
    taskRunner.answerTool(metadata.id, toolMessageId, data);
  };

  return (
    <div className="flex h-full flex-col p-4 pt-0">
      <TaskConversation
        messages={taskData?.messages ?? null}
        isLoading={taskLoading}
        onCustomToolAction={handleCustomToolAction}
      />
      <Activity mode={showContinueTask ? "visible" : "hidden"}>
        <ContinueTask onContinue={handleContinueTask} />
      </Activity>
      <PromptInput
        taskType={metadata.type}
        taskData={taskData}
        taskState={taskRunner.state}
        taskUsage={taskRunner.usage}
        onSubmit={handleSubmit}
        onCancel={taskRunner.cancel}
      />
    </div>
  );
}
