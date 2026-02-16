import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import type { ToolsetRead } from "@/api/generated/schemas";
import {
  getGetToolsetQueryKey,
  getGetToolsetsBriefQueryKey,
  useUpdateToolset,
} from "@/api/toolset";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField, SwitchField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { DynamicConfigFields } from "./fields/DynamicConfigFields";
import { ToolsetTypeSelectField } from "./fields/ToolsetTypeSelectField";
import {
  editFormValuesToPayload,
  type ToolsetEditFormValues,
  toolsetToEditFormValues,
} from "./form-types";
import { ToolList } from "./ToolList";

type ToolsetEditFormProps = {
  toolset: ToolsetRead;
  onConfirm?: () => void;
};

export function ToolsetEditForm({ toolset, onConfirm }: ToolsetEditFormProps) {
  const queryClient = useQueryClient();

  const formValues = useMemo(() => toolsetToEditFormValues(toolset), [toolset]);

  const updateMutation = useUpdateToolset({
    mutation: {
      onSuccess: (updatedToolset) => {
        queryClient.invalidateQueries({
          queryKey: getGetToolsetsBriefQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetToolsetQueryKey(updatedToolset.id),
        });
        toast.success("更新成功", {
          description: `已成功更新 ${updatedToolset.name} Toolset。`,
        });
        onConfirm?.();
      },
      onError: (error: Error) => {
        toast.error("更新失败", {
          description: error.message || "更新 Toolset 时发生错误，请稍后重试。",
        });
      },
    },
  });

  function handleSubmit(data: ToolsetEditFormValues) {
    const payload = editFormValuesToPayload(data);
    updateMutation.mutate({ toolsetId: toolset.id, data: payload });
  }

  return (
    <FormShell<ToolsetEditFormValues>
      values={formValues}
      onSubmit={handleSubmit}
    >
      <NameField fieldName="name" fieldProps={{ label: "名称" }} />

      <ToolsetTypeSelectField />

      <SwitchField fieldName="is_enabled" fieldProps={{ label: "启用" }} />

      <DynamicConfigFields />

      <ToolList />

      <FormShellFooter>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
