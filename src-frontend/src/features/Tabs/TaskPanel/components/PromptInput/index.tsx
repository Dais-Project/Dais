import type { ChatStatus } from "ai";
import { Suspense, useRef, useState } from "react";
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
import { ContextSelectPopover, type ContextSelectPopoverRef } from "./ContextSelectPopover";
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
  workspaceId: number;
  onChange: (agentId: number) => void;
};

function PromptInputAgentState({
  agentId,
  workspaceId,
  onChange,
}: PromptInputAgentStateProps) {
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
        <AgentSelectDialog
          agentId={agentId}
          workspaceId={workspaceId}
          onChange={onChange}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

type UsePromptInputHandlersResult = {
  text: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  contextSelectRef: React.RefObject<ContextSelectPopoverRef | null>;
  handleSelectPath: (path: string) => void;
  handleTextareaKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleContextClose: () => void;
};

function usePromptInputHandlers(): UsePromptInputHandlersResult {
  const { textInput } = usePromptInputController();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contextSelectRef = useRef<ContextSelectPopoverRef>(null);

  const handleInsert = (insertFn: ((textBefore: string) => string)) => {
    const textarea = inputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const contentBefore = insertFn(textarea.value.substring(0, start));
    const contentAfter = textarea.value.substring(end);
    textInput.setInput(contentBefore + contentAfter);

    requestAnimationFrame(() => {
      textarea.selectionStart = contentBefore.length;
      textarea.selectionEnd = contentBefore.length;
    });
  };

  const handleSelectPath = (path: string) => {
    if (path.includes(" ")) {
      path = `"${path}"`;
    }
    handleInsert((textBefore) => {
      if (textBefore.length === 0) {
        return path;
      }
      if (textBefore.endsWith(" ") || textBefore.endsWith("@") || textBefore.endsWith("\n")) {
        return textBefore + path;
      }
      return textBefore + " " + path;
    });
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "@") {
      e.preventDefault(); // prevent '@' from being entered into ContextSelectPopover
      contextSelectRef.current?.open();
      handleInsert((textBefore) => {
        if (textBefore.endsWith(" ") || textBefore.endsWith("\n")) {
          return textBefore + "@";
        }
        return textBefore + " @";
      });
    }
  };

  const handleContextClose = () => inputRef.current?.focus();

  return {
    get text() {
      return textInput.value;
    },
    inputRef,
    contextSelectRef,
    handleSelectPath,
    handleTextareaKeyDown,
    handleContextClose,
  };
}


type PromptInputDraftProps = {
  workspaceId: number;
  onSubmit: (message: PromptInputMessage, agentId: number) => void;
};

export function PromptInputDraft({ workspaceId, onSubmit }: PromptInputDraftProps) {
  const [agentId, setAgentId] = useState<number | null>(null);
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const {
    text,
    inputRef,
    contextSelectRef,
    handleSelectPath,
    handleTextareaKeyDown,
    handleContextClose,
  } = usePromptInputHandlers();
  const ableToSubmit = text.length && agentId !== null;

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
        <PromptInputTextarea
          ref={inputRef}
          className="pt-2 text-sm-plus!"
          placeholder={t("prompt.input_placeholder")}
          onKeyDown={handleTextareaKeyDown}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools className="gap-2">
          <ContextSelectPopover
            ref={contextSelectRef}
            workspaceId={workspaceId}
            onSelect={handleSelectPath}
            onClose={handleContextClose}
          />
          <PromptInputAgentState
            agentId={agentId}
            workspaceId={workspaceId}
            onChange={setAgentId}
          />
        </PromptInputTools>
        <div className="flex gap-2">
          <PromptInputActionAddAttachmentsButton />
          <PromptInputSubmit disabled={!ableToSubmit} />
        </div>
      </PromptInputFooter>
    </BasePromptInput>
  );
}

type PromptInputProps = {
  workspaceId: number;
  className?: string;
};

export function PromptInput({ workspaceId, className }: PromptInputProps) {
  const { t } = useTranslation(TABS_TASK_NAMESPACE);
  const { agentId, state } = useAgentTaskState();
  const { setAgentId, continue: continueTask, cancel } = useAgentTaskAction();
  const {
    text,
    inputRef,
    contextSelectRef,
    handleSelectPath,
    handleTextareaKeyDown,
    handleContextClose,
  } = usePromptInputHandlers();
  const ableToSubmit = text.length && state === "idle" && agentId !== null;

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
        <PromptInputTextarea
          ref={inputRef}
          className="pt-2 text-sm-plus!"
          placeholder={t("prompt.input_placeholder")}
          onKeyDown={handleTextareaKeyDown}
        />
      </PromptInputBody>
      <PromptInputFooter className="gap-16">
        <PromptInputTools className="min-w-0 gap-2">
          <ContextSelectPopover
            ref={contextSelectRef}
            workspaceId={workspaceId}
            onSelect={handleSelectPath}
            onClose={handleContextClose}
          />
          <PromptInputAgentState
            agentId={agentId}
            workspaceId={workspaceId}
            onChange={setAgentId}
          />
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
