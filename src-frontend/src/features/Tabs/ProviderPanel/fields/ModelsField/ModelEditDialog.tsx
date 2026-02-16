import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { LlmModelCreate } from "@/api/generated/schemas";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DEFAULT_LLM_MODEL } from "@/constants/provider";

type ModelEditDialogProps = {
  children: React.ReactNode;
  model: LlmModelCreate | null;
  onConfirm: (model: LlmModelCreate) => void;
  onCancel?: () => void;
};

export function ModelEditDialog({
  children,
  model,
  onConfirm,
  onCancel,
}: ModelEditDialogProps) {
  const { reset, handleSubmit, register, getFieldState, formState } =
    useForm<LlmModelCreate>({ defaultValues: DEFAULT_LLM_MODEL });

  useEffect(() => {
    if (model) {
      reset(model);
    }
  }, [model]);

  const handleSubmitForm = (data: LlmModelCreate) => {
    onConfirm(data);
  };

  const handleClose = () => {
    reset();
    onCancel?.();
  };

  return (
    <Dialog onOpenChange={(open) => !open && handleClose()}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{"编辑模型信息"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(handleSubmitForm)(e);
          }}
        >
          <FieldGroup className="gap-y-2">
            <FieldItem
              title="模型名称"
              fieldState={getFieldState("name", formState)}
            >
              <Input
                {...register("name", {
                  required: "请输入模型名称",
                  minLength: {
                    value: 1,
                    message: "模型名称不能为空",
                  },
                })}
                placeholder="请输入模型名称"
              />
            </FieldItem>

            <FieldItem
              title="上下文大小"
              fieldState={getFieldState("context_size", formState)}
            >
              <Input
                {...register("context_size", {
                  required: "请输入上下文大小",
                  min: {
                    value: 1,
                    message: "上下文大小必须大于 0",
                  },
                })}
                type="number"
                placeholder="请输入上下文大小"
              />
            </FieldItem>

            <Field className="mt-4 flex flex-row justify-between">
              <FieldLabel className="self-start">模型能力</FieldLabel>
              <div className="flex w-max flex-col items-end gap-3 pr-2">
                {[
                  {
                    name: "capability.vision" as const,
                    id: "vision",
                    label: "视觉能力",
                  },
                  {
                    name: "capability.reasoning" as const,
                    id: "reasoning",
                    label: "推理能力",
                  },
                  {
                    name: "capability.tool_use" as const,
                    id: "tool_use",
                    label: "工具调用",
                  },
                ].map((capability) => (
                  <Field
                    key={capability.id}
                    orientation="horizontal"
                    className="w-fit"
                  >
                    <Checkbox
                      id={capability.id}
                      {...register(capability.name, { value: false })}
                    />
                    <FieldLabel htmlFor={capability.id} className="font-normal">
                      {capability.label}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-8">
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
