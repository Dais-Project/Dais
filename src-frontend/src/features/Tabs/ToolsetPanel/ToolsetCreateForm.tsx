import { toast } from "sonner";
import { invalidateToolsetQueries, useCreateMcpToolset } from "@/api/toolset";
import { FormShell, FormShellFooter } from "@/components/custom/form/FormShell";
import { NameField } from "@/components/custom/form/fields";
import { Button } from "@/components/ui/button";
import { DynamicConfigFields } from "./fields/DynamicConfigFields";
import { ToolsetTypeSelectField } from "./fields/ToolsetTypeSelectField";
import {
  createFormValuesToPayload,
  type ToolsetCreateFormValues,
} from "./form-types";

type ToolsetCreateProps = {
  onConfirm?: () => void;
};

export function ToolsetCreateForm({ onConfirm }: ToolsetCreateProps) {
  const createMutation = useCreateMcpToolset({
    mutation: {
      async onSuccess(newToolset) {
        await invalidateToolsetQueries();
        toast.success("创建成功", {
          description: `已成功创建 ${newToolset.name} Toolset。`,
        });
        onConfirm?.();
      },
      onError(error: Error) {
        toast.error("创建失败", {
          description: error.message || "创建 Toolset 时发生错误，请稍后重试。",
        });
      },
    },
  });

  function handleSubmit(data: ToolsetCreateFormValues) {
    const payload = createFormValuesToPayload(data);
    createMutation.mutate({ data: payload });
  }

  return (
    <FormShell<ToolsetCreateFormValues> onSubmit={handleSubmit}>
      <NameField fieldName="name" fieldProps={{ label: "名称" }} />

      <ToolsetTypeSelectField />

      <DynamicConfigFields />

      <FormShellFooter>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "创建中..." : "创建"}
        </Button>
      </FormShellFooter>
    </FormShell>
  );
}
