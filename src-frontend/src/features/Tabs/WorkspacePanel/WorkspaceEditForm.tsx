import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import type { WorkspaceRead } from "@/api/generated/schemas";
import {
  getGetWorkspaceQueryKey,
  getGetWorkspacesQueryKey,
  useUpdateWorkspace,
} from "@/api/workspace";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import {
  DirectoryField,
  NameField,
  RichTextField,
} from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { AgentMultiSelectField } from "./fields/AgentMultiSelectField";
import {
  type WorkspaceEditFormValues,
  workspaceToEditFormValues,
} from "./form-types";

type WorkspaceEditFormProps = {
  workspace: WorkspaceRead;
  onConfirm?: () => void;
};

export function WorkspaceEditForm({
  workspace,
  onConfirm,
}: WorkspaceEditFormProps) {
  const queryClient = useQueryClient();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const syncCurrentWorkspace = useWorkspaceStore(
    (state) => state.syncCurrentWorkspace
  );

  const formValues = useMemo(
    () => workspaceToEditFormValues(workspace),
    [workspace]
  );

  const updateMutation = useUpdateWorkspace({
    mutation: {
      onSuccess: async (updatedWorkspace) => {
        queryClient.invalidateQueries({ queryKey: getGetWorkspacesQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetWorkspaceQueryKey(updatedWorkspace.id),
        });
        toast.success("更新成功", {
          description: `已成功更新工作区 "${updatedWorkspace.name}"。`,
        });
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

  function handleSubmit(data: WorkspaceEditFormValues) {
    updateMutation.mutate({ workspaceId: workspace.id, data });
  }

  return (
    <FormShell<WorkspaceEditFormValues>
      values={formValues}
      onSubmit={handleSubmit}
      className="h-full"
    >
      <NameField
        fieldName="name"
        fieldProps={{ label: "名称" }}
        controlProps={{ placeholder: "请输入工作区名称" }}
      />

      <DirectoryField
        fieldName="directory"
        fieldProps={{ label: "目录路径" }}
      />

      <RichTextField
        fieldName="workspace_background"
        fieldProps={{ label: "工作区概况", className: "mt-2" }}
        controlProps={{
          className: "mx-1 mt-2",
          editorClassName: "min-h-[8em]",
        }}
        minLength={0}
      />

      <AgentMultiSelectField
        fieldName="usable_agent_ids"
        fieldProps={{ label: "可用 Agent" }}
        initialAgents={workspace.usable_agents}
      />

      <FormShellFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
