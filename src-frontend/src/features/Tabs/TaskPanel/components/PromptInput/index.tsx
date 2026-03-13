import type { ChatStatus } from "ai";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";
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
import { uiUserMessageFactory } from "@/types/message";
import { cn } from "@/lib/utils";
import { AgentSelectDialog, AgentSelectErrorFallback } from "./AgentSelectDialog";
import { ContextUsage } from "./ContextUsage";
import { TaskProgress } from "./TaskProgress";
import { AttachmentsDisplay } from "./AttachmentsDisplay";
import { contextFileConcat, ContextSelectPopover } from "./ContextSelectPopover";
import { type TaskState, useAgentTaskAction, useAgentTaskState } from "../../hooks/use-agent-task";

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
  agentId: number | null;
  onChange: (agentId: number) => void;
};

function PromptInputAgentState({ agentId, onChange }: PromptInputAgentStateProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  return (
    <ErrorBoundary fallbackRender={(props) => <AgentSelectErrorFallback {...props} />}>
      <Suspense
        fallback={
          <Button variant="outline" disabled>
            {t("prompt.agent.loading")}
          </Button>
        }
      >
        <AgentSelectDialog agentId={agentId} onChange={onChange} />
      </Suspense>
    </ErrorBoundary>
  );
}

type PromptInputDraftProps = {
  onSubmit: (message: PromptInputMessage, agentId: number) => void;
};

export function PromptInputDraft({ onSubmit }: PromptInputDraftProps) {
  const [agentId, setAgentId] = useState<number | null>(null);
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { textInput } = usePromptInputController();
  const ableToSubmit = agentId !== null;

  const handleSelectPath = (path: string) => {
    const current = textInput.value;
    textInput.setInput(contextFileConcat(current, path));
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
        <PromptInputTextarea placeholder={t("prompt.input_placeholder")} />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools className="gap-2">
          <ContextSelectPopover onSelect={handleSelectPath} />
          <PromptInputAgentState agentId={agentId} onChange={setAgentId} />
        </PromptInputTools>
        <div className="flex gap-2">
          <PromptInputActionAddAttachmentsButton />
          <PromptInputSubmit disabled={!ableToSubmit} />
        </div>
      </PromptInputFooter>
    </BasePromptInput>
  );
}

export function PromptInput({ className }: { className?: string }) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { agentId, state } = useAgentTaskState();
  const { setAgentId, continue: continueTask, cancel } = useAgentTaskAction();
  const { textInput } = usePromptInputController();
  const ableToSubmit = textInput.value.length && state === "idle" && agentId !== null;

  const handleSelectPath = (path: string) => {
    const current = textInput.value;
    textInput.setInput(contextFileConcat(current, path));
  };

  return (
    <BasePromptInput
      globalDrop
      multiple
      className={cn("rounded-md bg-background", className)}
      onSubmit={(message) => {
        const userMessage = uiUserMessageFactory(message.text);
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
        <PromptInputTextarea placeholder={t("prompt.input_placeholder")} />
      </PromptInputBody>
      <PromptInputFooter className="gap-16">
        <PromptInputTools className="min-w-0 gap-2">
          <ContextSelectPopover onSelect={handleSelectPath} />
          <PromptInputAgentState agentId={agentId} onChange={setAgentId} />
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
