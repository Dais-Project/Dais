import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { MessageReplaceEvent, TaskRuntimeContext, TaskType, ToolReviewBody } from "@/api/generated/schemas";
import {
  useToolAnswer,
  useToolReviews,
  useEditTaskMessage,
  useApprovePendings,
  useAppendTaskMessage,
} from "@/api/tasks";
import { uiUserMessageFactory, toSdkMessage } from "@/types/message";

type UseTaskControlProps = {
  taskId: number;
  taskType: TaskType;
  agentId: number | null;
  onTaskContinue: () => void;
  onMessageReplace: (eventData: MessageReplaceEvent) => void;
  onUpdateRuntimeContext: (runtimeContext: TaskRuntimeContext) => void;
};

export type UseTaskControlResult = {
  answerTool: (toolCallId: string, answer: string) => Promise<void>;
  reviewTool: (toolCallId: string, status: ToolReviewBody["status"]) => Promise<void>;
  approvePendings: () => Promise<void>;

  appendMessage: (text: string, attachments: File[]) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
};

export function useTaskControl({
  taskId,
  taskType,
  agentId,
  onTaskContinue,
  onMessageReplace,
  onUpdateRuntimeContext,
}: UseTaskControlProps): UseTaskControlResult {
  const answerToolMutation = useToolAnswer({
    mutation: {
      onSuccess(eventData) {
        onMessageReplace(eventData);
        onTaskContinue();
      },
    },
  });

  const toolReviewMutation = useToolReviews({
    mutation: {
      onSuccess(eventData) {
        if (eventData) {
          onMessageReplace(eventData);
        }
        onTaskContinue();
      },
    },
  });

  const approvePendingsMutation = useApprovePendings({
    mutation: {
      onSuccess(eventData) {
        if (!eventData) return;
        for (const replaceEvent of eventData) {
          onMessageReplace(replaceEvent);
        }
        onTaskContinue();
      }
    }
  });

  const appendMessageMutation = useAppendTaskMessage({
    mutation: {
      onSuccess(runtimeContext) {
        onUpdateRuntimeContext(runtimeContext);
        onTaskContinue();
      }
    }
  });

  const editMessageMutation = useEditTaskMessage({
    mutation: {
      onSuccess(runtimeContext) {
        onUpdateRuntimeContext(runtimeContext);
        onTaskContinue();
      },
    },
  });

  const answerTool = useCallback(async (toolCallId: string, answer: string) => {
    if (agentId === null) {
      toast.error("任务失败", { description: "请先选择一个 Agent。" });
      return;
    }
    await answerToolMutation.mutateAsync({
      taskId, taskType,
      data: { call_id: toolCallId, agent_id: agentId, answer }
    });
  }, [answerToolMutation, taskId, taskType, agentId]);

  const reviewTool = useCallback(
    async (toolCallId: string, status: ToolReviewBody["status"]) => {
      if (agentId === null) {
        toast.error("任务失败", { description: "请先选择一个 Agent。" });
        return;
      }
      await toolReviewMutation.mutateAsync({
        taskId, taskType,
        // TODO: pass auto approve after the backend supports
        data: { call_id: toolCallId, agent_id: agentId, status, auto_approve: false }
      });
    }, [toolReviewMutation, taskId, taskType, agentId]
  );

  const approvePendings = useCallback(async () => {
    if (agentId === null) {
      toast.error("任务失败", { description: "请先选择一个 Agent。" });
      return;
    }
    await approvePendingsMutation.mutateAsync({
      taskId, taskType,
      data: { agent_id: agentId, }
    });
  }, [approvePendingsMutation, taskId, taskType, agentId]);


  const appendMessage = useCallback(async (text: string, attachments: File[]) => {
    if (agentId === null) {
      toast.error("任务失败", { description: "请先选择一个 Agent。" });
      return;
    }
    const userMessage = uiUserMessageFactory(text);
    const body = JSON.stringify({
      message: toSdkMessage(userMessage),
      agent_id: agentId,
    });
    await appendMessageMutation.mutateAsync({
      taskId, taskType, data: {
        body, uploaded_files: attachments
      }
    });
  }, [appendMessageMutation, taskId, taskType, agentId]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (agentId === null) {
      toast.error("任务失败", { description: "请先选择一个 Agent。" });
      return;
    }
    await editMessageMutation.mutateAsync({
      taskId, taskType, data: {
        message_id: messageId,
        agent_id: agentId,
        content
      }
    });
  }, [editMessageMutation, taskType, taskId, agentId]);

  return useMemo(() => ({
    answerTool,
    approvePendings,
    reviewTool,
    appendMessage,
    editMessage,
  }), [answerTool, approvePendings, reviewTool, appendMessage, editMessage]);
}