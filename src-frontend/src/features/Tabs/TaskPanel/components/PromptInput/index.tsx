import type { ChatStatus } from "ai";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { TaskType, UserMessage } from "@/api/generated/schemas";
import {
  PromptInput as BasePromptInput,
  PromptInputActionAddAttachmentsButton,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { type TaskState, useAgentTaskAction, useAgentTaskState } from "../../hooks/use-agent-task";
import { AgentSelectDialog, AgentSelectErrorFallback } from "./AgentSelectDialog";
import { ContextUsage } from "./ContextUsage";
import { TaskProgress } from "./TaskProgress";
import { AttachmentsDisplay } from "./AttachmentsDisplay";
import { ContextSelectPopover } from "./ContextSelectPopover";

export { PromptInputProvider } from "@/components/ai-elements/prompt-input";

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

function PromptInputAgentState({ taskType, agentId, onChange }: PromptInputAgentStateProps) {
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

export function PromptInputDraft({ taskType, onSubmit }: PromptInputDraftProps) {
  const [agentId, setAgentId] = useState<number | null>(null);
  const { textInput } = usePromptInputController();
  const ableToSubmit = agentId !== null;

  const handleSelectPath = (path: string) => {
    const current = textInput.value;
    if (current.length === 0) {
      textInput.setInput(path);
      return;
    }
    textInput.setInput(`${current} ${path} `);
  };

  return (
    <BasePromptInput
      globalDrop
      multiple
      className="max-w-2xl rounded-md bg-background"
      onSubmit={(message) => {
        if (ableToSubmit) {
          onSubmit(message, agentId);
        }
      }}
    >
      <PromptInputHeader className="py-0.5">
        <AttachmentsDisplay />
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools className="gap-2">
          <ContextSelectPopover onSelect={handleSelectPath} />
          <PromptInputAgentState taskType={taskType} agentId={agentId} onChange={setAgentId} />
        </PromptInputTools>
        <div className="flex gap-2">
          <PromptInputActionAddAttachmentsButton />
          <PromptInputSubmit disabled={!ableToSubmit} />
        </div>
      </PromptInputFooter>
    </BasePromptInput>
  );
}

export function PromptInput() {
  const { agentId, data, state } = useAgentTaskState();
  const { setAgentId, continue: continueTask, cancel } = useAgentTaskAction();
  const { textInput } = usePromptInputController();
  const ableToSubmit = textInput.value.length && state === "idle" && agentId !== null;

  const handleSelectPath = (path: string) => {
    const current = textInput.value;
    if (current.length === 0) {
      textInput.setInput(path);
      return;
    }
    textInput.setInput(`${current} ${path} `);
  };

  return (
    <BasePromptInput
      globalDrop
      multiple
      className="rounded-md bg-background"
      onSubmit={(message) => {
        const userMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: message.text,
          attachments: null,
        } satisfies UserMessage;
        if (ableToSubmit) {
          continueTask(userMessage);
        } else if (state === "running") {
          cancel();
        }
      }}
    >
      <PromptInputHeader className="py-0.5">
        <AttachmentsDisplay />
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea />
      </PromptInputBody>
      <PromptInputFooter className="gap-16">
        <PromptInputTools className="min-w-0 gap-2">
          <ContextSelectPopover onSelect={handleSelectPath} />
          <PromptInputAgentState taskType={data.type} agentId={agentId} onChange={setAgentId} />
          <ContextUsage />
          <TaskProgress className="min-w-0 flex-1" />
        </PromptInputTools>
        <div className="flex gap-2">
          <PromptInputActionAddAttachmentsButton />
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
        </div>
      </PromptInputFooter>
    </BasePromptInput>
  );
}
