import { useCallback, useMemo, useState } from "react";
import { produce } from "immer";
import { useUnmount } from "ahooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  BuiltInTools,
  type ExecutionControlUpdateTodosTodosItem as TodoItem,
  type TaskRuntimeContext,
  type TaskType,
  type TaskUsage,
} from "@/api/generated/schemas";
import {
  getGetTaskRuntimeContextQueryKey,
  useGetTaskRuntimeContextSuspense,
} from "@/api/tasks";
import { UpdateTodosSchema } from "@/api/tool-schema";
import { tryParseSchema } from "@/lib/utils";
import type { SdkMessage, UiMessage } from "@/types/message";
import { toUiMessage } from "@/types/message";
import type { TaskFlags } from ".";
import { resolveInitialFlags, useTaskFlags } from "./use-task-flags";

function findLatestTodoList(messages: SdkMessage[]): TodoItem[] | null {
  for (const message of messages.reverseIter()) {
    if (
      message.role === "tool" &&
      message.name === BuiltInTools.ExecutionControl__update_todos
    ) {
      const todoList = tryParseSchema(UpdateTodosSchema, message.arguments);
      if (todoList) {
        return todoList.todos;
      }
    }
  }
  return null;
}

type TaskRuntimeStates = {
  revision: number | null;
  flags: TaskFlags;
  agentId: number | null;
  usage: TaskUsage;
  messages: UiMessage[];
  todos: TodoItem[] | null;
};

type TaskRuntimeActions = {
  setAgentId: React.Dispatch<React.SetStateAction<number | null>>;
  setFlag: (newFlags: Partial<TaskFlags>) => void;
  resetFlags: () => void;
  setUsage: React.Dispatch<React.SetStateAction<TaskUsage>>;
  setTodos: React.Dispatch<React.SetStateAction<TodoItem[] | null>>;
  setData: (updater: ImmerUpdater<UiMessage[]>) => void;
  applyRuntimeContext: (runtimeContext: TaskRuntimeContext) => void;
};

type UseTaskRuntimeStateResult = [TaskRuntimeStates, TaskRuntimeActions];

export function useTaskRuntimeState(
  taskType: TaskType,
  taskId: number,
): UseTaskRuntimeStateResult {
  const queryClient = useQueryClient();
  const { data } = useGetTaskRuntimeContextSuspense(taskType, taskId, {
    query: {
      staleTime: Infinity,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  });

  const [agentId, setAgentId] = useState(data.agent_id);
  const {
    flags,
    setFlag,
    reset: resetFlags,
  } = useTaskFlags(() => resolveInitialFlags(data.messages));
  const [usage, setUsage] = useState<TaskUsage>(data.usage);
  const [messages, setMessages] = useState<UiMessage[]>(() =>
    toUiMessage(data.messages),
  );
  const [todos, setTodos] = useState<TodoItem[] | null>(
    () => findLatestTodoList(data.messages) ?? null,
  );

  const setData = useCallback((updater: ImmerUpdater<UiMessage[]>) => {
    setMessages(produce((draft) => updater(draft)));
  }, []);

  const applyRuntimeContext = useCallback(
    (runtimeContext: TaskRuntimeContext) => {
      setAgentId(runtimeContext.agent_id);
      setUsage(runtimeContext.usage);
      setMessages(toUiMessage(runtimeContext.messages));
      setTodos(findLatestTodoList(runtimeContext.messages) ?? null);
    },
    [],
  );

  useUnmount(() => {
    queryClient.removeQueries({
      queryKey: getGetTaskRuntimeContextQueryKey(taskType, taskId),
    });
  });

  const states = useMemo<TaskRuntimeStates>(
    () => ({
      revision: data.revision ?? null,
      flags,
      agentId,
      usage,
      messages,
      todos,
    }),
    [data.revision, flags, agentId, usage, messages, todos],
  );

  const actions = useMemo<TaskRuntimeActions>(
    () => ({
      setAgentId,
      setFlag,
      resetFlags,
      setUsage,
      setTodos,
      setData,
      applyRuntimeContext,
    }),
    [setFlag, resetFlags, setData, applyRuntimeContext],
  );

  return [states, actions];
}
