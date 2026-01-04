import type { ChatStatus } from "ai";
import { ChevronsUpDownIcon, Loader2Icon } from "lucide-react";
import { Activity, useEffect, useState } from "react";
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@/components/ai-elements/context";
import {
  PromptInput as BasePromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { SingleSelectDialog } from "@/components/custom/dialog/SingleSelectDialog";
import { Button } from "@/components/ui/button";
import { ORCHESTRATOR_ID } from "@/constants/agent";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { AgentRead } from "@/types/agent";
import type { TaskRead, TaskType, TaskUsage } from "@/types/task";
import type { TaskState } from "./use-task-runner";

type AgentSelectDialogProps = {
  value: AgentRead | null;
  onValueChange: (agent: AgentRead | null) => void;
};

function AgentSelectDialog({ value, onValueChange }: AgentSelectDialogProps) {
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const isCurrentWorkspaceLoading = useWorkspaceStore(
    (state) => state.isLoading
  );
  const agents = currentWorkspace?.usable_agents ?? [];

  let buttonText = "Select agent";
  if (isCurrentWorkspaceLoading) {
    buttonText = "Loading...";
  } else if (value) {
    buttonText = value.name;
  }

  return (
    <SingleSelectDialog
      value={value ?? undefined}
      selections={agents}
      getKey={(agent) => agent.id}
      getValue={(agent) => agent.name}
      onSelect={onValueChange}
      placeholder="Search agent..."
      emptyText="No agent found."
    >
      <Button
        variant="outline"
        role="combobox"
        className="justify-between"
        disabled={isCurrentWorkspaceLoading}
      >
        {buttonText}
        {isCurrentWorkspaceLoading ? (
          <Loader2Icon className="ml-2 size-4 shrink-0 animate-spin" />
        ) : (
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        )}
      </Button>
    </SingleSelectDialog>
  );
}

type PromptInputProps = {
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

function ContectUsage({ usage }: { usage: TaskUsage }) {
  if (usage.max_tokens === 0) {
    return null;
  }
  return (
    <Context
      maxTokens={usage.max_tokens}
      usage={{
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        totalTokens: usage.total_tokens,
      }}
      usedTokens={usage.total_tokens}
    >
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <ContextInputUsage />
          <ContextOutputUsage />
          <ContextReasoningUsage />
          <ContextCacheUsage />
        </ContextContentBody>
      </ContextContent>
    </Context>
  );
}

export function PromptInput({
  taskType,
  taskData,
  taskState,
  taskUsage,
  onSubmit,
  onCancel,
}: PromptInputProps) {
  const { currentWorkspace } = useWorkspaceStore();
  const [prompt, setPrompt] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentRead | null>(null);
  const ableToSubmit =
    prompt.trim() !== "" &&
    (taskType === "orchestration" || selectedAgent !== null);

  useEffect(() => {
    if (taskData) {
      const initialAgent = currentWorkspace?.usable_agents.find(
        (a) => a.id === taskData?.agent_id
      );
      setSelectedAgent(initialAgent ?? null);
    }
  }, [taskData, currentWorkspace]);

  return (
    <BasePromptInput
      className="rounded-md bg-background"
      onSubmit={(message) => {
        if (taskState === "idle") {
          setPrompt("");
          onSubmit(message, selectedAgent?.id ?? ORCHESTRATOR_ID);
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
            <Activity mode={taskType === "agent" ? "visible" : "hidden"}>
              <AgentSelectDialog
                value={selectedAgent}
                onValueChange={setSelectedAgent}
              />
            </Activity>
          )}
          {taskType === "orchestration" && (
            <Activity
              mode={taskType === "orchestration" ? "visible" : "hidden"}
            >
              <Button variant="outline" disabled>
                Orchestrator
              </Button>
            </Activity>
          )}
          <ContectUsage usage={taskUsage} />
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
          onClick={() => {
            if (taskState === "running") {
              onCancel?.();
            }
          }}
        />
      </PromptInputFooter>
    </BasePromptInput>
  );
}
