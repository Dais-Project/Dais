import type { ChatStatus } from "ai";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { TaskType, UserMessage } from "@/api/generated/schemas";
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
import {
  type TaskState,
  useAgentTaskAction,
  useAgentTaskState,
} from "../../hooks/use-agent-task";
import {
  AgentSelectDialog,
  AgentSelectErrorFallback,
} from "./AgentSelectDialog";
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

type PromptInputAgentStateProps = {
  taskType: TaskType;
  agentId: number | null;
  onChange: (agentId: number) => void;
};

function PromptInputAgentState({
  taskType,
  agentId,
  onChange,
}: PromptInputAgentStateProps) {
  switch (taskType) {
    case "agent":
      return (
        <ErrorBoundary fallbackRender={AgentSelectErrorFallback}>
          <Suspense
            fallback={
              <Button variant="outline" disabled>
                Loading...
              </Button>
            }
          >
            <AgentSelectDialog agentId={agentId} onChange={onChange} />
          </Suspense>
        </ErrorBoundary>
      );
    case "orchestration":
      return (
        <Button variant="outline" disabled>
          Orchestrator
        </Button>
      );
    default:
      return null;
  }
}

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
          <PromptInputAgentState
            taskType={taskType}
            agentId={agentId}
            onChange={setAgentId}
          />
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
        const userMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: message.text,
        } satisfies UserMessage;
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
          <PromptInputAgentState
            taskType={data.type}
            agentId={agentId}
            onChange={setAgentId}
          />
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
