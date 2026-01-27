import type { ChatStatus } from "ai";
import { useState } from "react";
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
import type { UserMessage } from "@/types/message";
import type { TaskType } from "@/types/task";
import {
  type TaskState,
  useAgentTaskAction,
  useAgentTaskState,
} from "../../use-agent-task";
import { AgentSelectDialog } from "./AgentSelectDialog";
import { ContextUsage } from "./ContextUsage";

export type PromptInputHandle = {
  agentId: number | null;
};

export type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

const PROMPTINPUT_STATE_MAPPING: Record<TaskState, ChatStatus> = {
  idle: "ready",
  waiting: "submitted",
  running: "streaming",
  error: "error",
};

type PromptInputDraftProps = {
  taskType: TaskType;
  onSubmit: (message: PromptInputMessage, agentId: number) => void;
};

export function PromptInputDraft({
  taskType,
  onSubmit,
}: PromptInputDraftProps) {
  const [agentId, setAgentId] = useState<number | null>(null);
  const ableToSubmit = agentId !== null;
  return (
    <BasePromptInput
      className="max-w-2xl rounded-md bg-background"
      onSubmit={(message) => {
        if (ableToSubmit) {
          onSubmit(message, agentId);
        }
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea />
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
        </PromptInputTools>
        <PromptInputSubmit disabled={!ableToSubmit} />
      </PromptInputFooter>
    </BasePromptInput>
  );
}

export function PromptInput() {
  const { agentId, data, usage, state } = useAgentTaskState();
  const { setAgentId, continue: continueTask, cancel } = useAgentTaskAction();

  const [prompt, setPrompt] = useState("");
  const ableToSubmit = prompt.length && state === "idle" && agentId !== null;

  return (
    <BasePromptInput
      className="rounded-md bg-background"
      onSubmit={(message) => {
        const userMessage: UserMessage = {
          role: "user",
          content: message.text,
        };
        if (ableToSubmit) {
          setPrompt("");
          continueTask(userMessage);
        } else if (state === "running") {
          cancel();
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
          {data.type === "agent" && (
            <AgentSelectDialog agentId={agentId} onChange={setAgentId} />
          )}
          {data.type === "orchestration" && (
            <Button variant="outline" disabled>
              Orchestrator
            </Button>
          )}
          {usage && <ContextUsage usage={usage} />}
        </PromptInputTools>
        <PromptInputSubmit
          status={PROMPTINPUT_STATE_MAPPING[state]}
          disabled={(() => {
            if (state === "running") {
              return false;
            }
            if (state === "waiting") {
              return true;
            }
            return !ableToSubmit;
          })()}
        />
      </PromptInputFooter>
    </BasePromptInput>
  );
}
