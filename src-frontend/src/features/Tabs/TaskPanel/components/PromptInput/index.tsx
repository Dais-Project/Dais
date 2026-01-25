import type { ChatStatus } from "ai";
import { type Ref, useEffect, useImperativeHandle, useState } from "react";
import {
  PromptInput as BasePromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import type { TaskRead, TaskType, TaskUsage } from "@/types/task";
import type { TaskState } from "../../use-task-runner";
import { AgentSelectDialog } from "./AgentSelectDialog";
import { ContextUsage } from "./ContextUsage";

export type PromptInputHandle = {
  agentId: number | null;
};

type PromptInputProps = {
  ref: Ref<{
    agentId: number | null;
  }>;
  taskType: TaskType;
  taskData: TaskRead | null;
  taskState: TaskState;
  taskUsage: TaskUsage;
  onSubmit: (message: PromptInputMessage, agentId: number) => void;
  onCancel?: () => void;
};

export type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

const stateMapping = {
  idle: "ready",
  waiting: "submitted",
  running: "streaming",
} satisfies Record<TaskState, ChatStatus>;

export function PromptInput({
  ref,
  taskType,
  taskData,
  taskState,
  taskUsage,
  onSubmit,
  onCancel,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [agentId, setAgentId] = useState<number | null>(null);
  const ableToSubmit = prompt.length && agentId !== null;

  useEffect(() => {
    if (taskData) {
      setAgentId(taskData.agent_id);
    }
  }, [taskData]);

  useImperativeHandle(
    ref,
    () => ({
      get agentId() {
        return agentId;
      },
    }),
    [agentId]
  );

  return (
    <BasePromptInput
      className="rounded-md bg-background"
      onSubmit={(message) => {
        if (taskState === "idle" && ableToSubmit) {
          setPrompt("");
          onSubmit(message, agentId);
        }
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea
          onChange={(e) => setPrompt(e.target.value)}
          value={prompt}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          {taskType === "agent" && (
            <AgentSelectDialog agentId={agentId} onChange={setAgentId} />
          )}
          {taskType === "orchestration" && (
            <Button variant="outline" disabled>
              Orchestrator
            </Button>
          )}
          <ContextUsage usage={taskUsage} />
        </PromptInputTools>
        <PromptInputSubmit
          status={stateMapping[taskState]}
          disabled={(() => {
            if (taskState === "running") {
              return false;
            }
            if (taskState === "waiting") {
              return true;
            }
            return !ableToSubmit;
          })()}
          onClick={() => taskState === "running" && onCancel?.()}
        />
      </PromptInputFooter>
    </BasePromptInput>
  );
}
