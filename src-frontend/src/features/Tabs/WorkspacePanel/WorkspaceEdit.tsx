import { useQueryClient } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-dialog";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useGetAgentsInfinite } from "@/api/agent";
import type {
  AgentBrief,
  WorkspaceCreate,
  WorkspaceRead,
} from "@/api/generated/schemas";
import {
  getGetWorkspaceQueryKey,
  getGetWorkspacesQueryKey,
  useCreateWorkspace,
  useUpdateWorkspace,
} from "@/api/workspace";
import {
  SelectDialog,
  SelectDialogContent,
  SelectDialogEmpty,
  SelectDialogFooter,
  SelectDialogGroup,
  SelectDialogItem,
  SelectDialogList,
  SelectDialogSearch,
  SelectDialogTrigger,
} from "@/components/custom/dialog/SelectDialog";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { MinimalTiptapEditor } from "@/components/ui/minimal-tiptap";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { useWorkspaceStore } from "@/stores/workspace-store";

type AgentSelectDialogProps = {
  existingAgents: AgentBrief[];
  onConfirm?: (selectedAgents: AgentBrief[]) => void;
};

export function AgentSelectDialog({
  existingAgents,
  onConfirm,
}: AgentSelectDialogProps) {
  const { data: allAgents, isLoading } = useGetAgentsInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  const agents: AgentBrief[] =
    allAgents?.pages.flatMap((page) => page.items) ?? [];

  const handleConfirm = (selectedIds: string[]) => {
    const selectedSet = new Set(selectedIds);
    onConfirm?.(agents.filter((agent) => selectedSet.has(agent.id.toString())));
  };

  return (
    <SelectDialog
      mode="multi"
      value={existingAgents.map((agent) => agent.id.toString())}
    >
      <SelectDialogTrigger>
        <Button type="button" variant="outline" disabled={isLoading}>
          {isLoading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
          {isLoading ? "加载中..." : "选择"}
        </Button>
      </SelectDialogTrigger>
      <SelectDialogContent>
        <SelectDialogSearch placeholder="搜索 Agent..." />
        <SelectDialogList>
          <SelectDialogEmpty>未找到匹配的 Agent</SelectDialogEmpty>
          <SelectDialogGroup>
            {agents.map((agent) => (
              <SelectDialogItem key={agent.id} value={agent.id.toString()}>
                {agent.name}
              </SelectDialogItem>
            ))}
          </SelectDialogGroup>
        </SelectDialogList>
        <SelectDialogFooter
          onConfirm={handleConfirm}
          confirmText="确定"
          cancelText="取消"
        />
      </SelectDialogContent>
    </SelectDialog>
  );
}

type WorkspaceEditProps = {
  workspace: WorkspaceRead | WorkspaceCreate;
  onConfirm?: () => void;
};

type FormValues = WorkspaceCreate;

export function WorkspaceEdit({ workspace, onConfirm }: WorkspaceEditProps) {
  const isEditMode = "id" in workspace;
  const queryClient = useQueryClient();

  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const syncCurrentWorkspace = useWorkspaceStore(
    (state) => state.syncCurrentWorkspace
  );

  const [usableAgents, setUsableAgents] = useState<AgentBrief[]>(
    isEditMode ? workspace.usable_agents : []
  );

  const { handleSubmit, control, setValue, reset } = useForm<FormValues>();

  useEffect(() => {
    if (workspace) {
      const usableAgentsLocal = isEditMode ? workspace.usable_agents : [];
      setUsableAgents(usableAgentsLocal);
      reset({
        name: workspace.name,
        directory: workspace.directory,
        usable_agent_ids: usableAgentsLocal.map((a) => a.id),
      });
    }
  }, [workspace, reset, isEditMode]);

  const createWorkspaceMutation = useCreateWorkspace({
    mutation: {
      onSuccess: (newWorkspace) => {
        queryClient.invalidateQueries({ queryKey: getGetWorkspacesQueryKey() });
        toast.success("创建成功", {
          description: `已成功创建工作区 "${newWorkspace.name}"。`,
        });
        reset();
        onConfirm?.();
      },
      onError: (error: Error) => {
        toast.error("创建失败", {
          description: error.message || "创建工作区时发生错误，请稍后重试。",
        });
      },
    },
  });

  const updateWorkspaceMutation = useUpdateWorkspace({
    mutation: {
      onSuccess: async (updatedWorkspace) => {
        queryClient.invalidateQueries({ queryKey: getGetWorkspacesQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetWorkspaceQueryKey(updatedWorkspace.id),
        });
        toast.success("更新成功", {
          description: `已成功更新工作区 "${updatedWorkspace.name}"。`,
        });
        reset();
        onConfirm?.();

        if (updatedWorkspace.id === currentWorkspace?.id) {
          await syncCurrentWorkspace();
        }
      },
      onError: (error: Error) => {
        toast.error("更新失败", {
          description: error.message || "更新工作区时发生错误，请稍后重试。",
        });
      },
    },
  });

  async function chooseDirectory() {
    try {
      const selected = await open({ directory: true });
      if (typeof selected === "string") {
        setValue("directory", selected);
      }
    } catch (e) {
      console.error(e);
      toast.error("选择目录失败");
    }
  }

  const onSubmit = (data: FormValues) => {
    if (isEditMode) {
      updateWorkspaceMutation.mutate({ workspaceId: workspace.id, data });
    } else {
      createWorkspaceMutation.mutate({ data });
    }
  };

  function handleAgentConfirm(selectedAgents: AgentBrief[]) {
    setValue(
      "usable_agent_ids",
      selectedAgents.map((a) => a.id)
    );
    setUsableAgents(selectedAgents);
  }

  const isLoading =
    createWorkspaceMutation.isPending || updateWorkspaceMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="h-full py-4">
      <FieldGroup className="h-full gap-y-2">
        <Controller
          name="name"
          control={control}
          rules={{
            required: "名称为必填项",
            minLength: { value: 1, message: "名称不能为空" },
            maxLength: { value: 100, message: "名称最多100字符" },
          }}
          render={({ field, fieldState }) => (
            <FieldItem label="名称" fieldState={fieldState}>
              <Input {...field} placeholder="请输入工作区名称" />
            </FieldItem>
          )}
        />

        <Controller
          name="directory"
          control={control}
          rules={{ required: "目录路径为必填项" }}
          render={({ field, fieldState }) => (
            <FieldItem label="目录路径" fieldState={fieldState}>
              <div className="flex gap-2">
                <Input
                  {...field}
                  placeholder="请输入目录路径，或点击选择"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={chooseDirectory}
                  variant="outline"
                >
                  选择
                </Button>
              </div>
            </FieldItem>
          )}
        />

        <Controller
          name="workspace_background"
          control={control}
          render={({ field, fieldState }) => (
            <FieldItem
              label="工作区概况"
              fieldState={fieldState}
              className="mt-2"
              orientation="vertical"
            >
              <MinimalTiptapEditor
                {...field}
                className="mx-1 mt-2"
                editorClassName="min-h-[8em]"
              />
            </FieldItem>
          )}
        />

        <Controller
          name="usable_agent_ids"
          control={control}
          render={({ fieldState }) => (
            <div>
              <FieldItem label="可用 Agent" fieldState={fieldState}>
                <AgentSelectDialog
                  existingAgents={usableAgents}
                  onConfirm={handleAgentConfirm}
                />
              </FieldItem>
              <div className="mt-2 space-y-2">
                {usableAgents.map(({ name, id }) => (
                  <Item key={id} variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle>{name}</ItemTitle>
                    </ItemContent>
                  </Item>
                ))}
              </div>
            </div>
          )}
        />

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {(() => {
              if (isEditMode) {
                return isLoading ? "保存中..." : "保存";
              }
              return isLoading ? "创建中..." : "创建";
            })()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
