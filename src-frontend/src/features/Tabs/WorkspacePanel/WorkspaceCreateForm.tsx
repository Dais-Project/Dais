import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getGetWorkspacesQueryKey, useCreateWorkspace } from "@/api/workspace";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import {
  DirectoryField,
  NameField,
  RichTextField,
} from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { DEFAULT_WORKSPACE } from "@/constants/workspace";
import { AgentMultiSelectField } from "./fields/AgentMultiSelectField";
import type { WorkspaceCreateFormValues } from "./form-types";

type WorkspaceCreateFormProps = {
  onConfirm?: () => void;
};

export function WorkspaceCreateForm({ onConfirm }: WorkspaceCreateFormProps) {
  const queryClient = useQueryClient();

  const createMutation = useCreateWorkspace({
    mutation: {
      onSuccess: (newWorkspace) => {
        queryClient.invalidateQueries({ queryKey: getGetWorkspacesQueryKey() });
        toast.success("创建成功", {
          description: `已成功创建工作区 "${newWorkspace.name}"。`,
        });
        onConfirm?.();
      },
      onError: (error: Error) => {
        toast.error("创建失败", {
          description: error.message || "创建工作区时发生错误，请稍后重试。",
        });
      },
    },
  });

  function handleSubmit(data: WorkspaceCreateFormValues) {
    createMutation.mutate({ data });
  }

  return (
    <FormShell<WorkspaceCreateFormValues>
      values={DEFAULT_WORKSPACE}
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

      <AgentMultiSelectField />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "创建中..." : "创建"}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
