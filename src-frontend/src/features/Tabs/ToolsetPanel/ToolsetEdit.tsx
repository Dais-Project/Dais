import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createToolset, updateToolset } from "@/api/toolset";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  LocalServerParams,
  RemoteServerParams,
  ToolsetCreate,
  ToolsetParams,
  ToolsetRead,
  ToolsetUpdate,
} from "@/types/toolset";
import { ToolList } from "./ToolList";

const URL_REGEX = /^(https?:\/\/)([^\s/$.?#].[^\s]*)$/;

// TODO: replace with I18N
const TOOLSET_TYPE_LABELS: Record<"mcp_local" | "mcp_remote", string> = {
  mcp_local: "Local MCP",
  mcp_remote: "Remote MCP",
};

type FormData = {
  name: string;
  type: "mcp_local" | "mcp_remote";
  is_enabled?: boolean;
  // Local fields
  command?: string;
  args?: string;
  // Remote fields
  url?: string;
  http_headers?: string;
};

type ToolsetEditProps = {
  toolset: ToolsetRead | ToolsetCreate;
  onConfirm?: () => void;
};

export function ToolsetEdit({ toolset, onConfirm }: ToolsetEditProps) {
  const isEditMode = "id" in toolset;
  const queryClient = useQueryClient();

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
    control,
  } = useForm<FormData>();

  useEffect(() => {
    const formData: FormData = {
      name: toolset.name,
      type: toolset.type as "mcp_local" | "mcp_remote",
    };

    if (isEditMode) {
      formData.is_enabled = toolset.is_enabled;
    }

    if (toolset.type === "mcp_local" && toolset.params) {
      const params = toolset.params as LocalServerParams;
      formData.command = params.command;
      formData.args = params.args?.join("\n") || "";
    } else if (toolset.type === "mcp_remote" && toolset.params) {
      const params = toolset.params as RemoteServerParams;
      formData.url = params.url;
      formData.http_headers = params.http_headers
        ? JSON.stringify(params.http_headers, null, 2)
        : "";
    }

    reset(formData);
  }, [toolset, reset, isEditMode]);

  const formValues = useWatch({ control });
  const currentType = formValues.type;

  const createToolsetMutation = useMutation({
    mutationFn: createToolset,
    onSuccess: (newToolset) => {
      queryClient.invalidateQueries({ queryKey: ["toolsets"] });
      toast.success("创建成功", {
        description: `已成功创建 ${newToolset.name} Toolset。`,
      });
      reset();
      onConfirm?.();
    },
    onError: (error: Error) => {
      toast.error("创建失败", {
        description: error.message || "创建 Toolset 时发生错误，请稍后重试。",
      });
    },
  });

  const updateToolsetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ToolsetUpdate }) =>
      updateToolset(id, data),
    onSuccess: (updatedToolset) => {
      queryClient.invalidateQueries({ queryKey: ["toolsets"] });
      queryClient.invalidateQueries({
        queryKey: ["toolset", updatedToolset.id],
      });
      toast.success("更新成功", {
        description: `已成功更新 ${updatedToolset.name} Toolset。`,
      });
      reset();
      onConfirm?.();
    },
    onError: (error: Error) => {
      toast.error("更新失败", {
        description: error.message || "更新 Toolset 时发生错误，请稍后重试。",
      });
    },
  });

  const onSubmit = (formData: FormData) => {
    let params: ToolsetParams;

    if (formData.type === "mcp_local") {
      const command = formData.command || "";
      params = {
        command,
        args: formData.args
          ? formData.args
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line !== "")
          : undefined,
      };
    } else {
      const url = formData.url || "";
      params = {
        url,
        http_headers: formData.http_headers
          ? JSON.parse(formData.http_headers)
          : undefined,
      };
    }

    const data: ToolsetCreate | ToolsetUpdate = {
      name: formData.name,
      type: formData.type,
      params,
    };

    if (isEditMode) {
      (data as ToolsetUpdate).is_enabled = formData.is_enabled;
      updateToolsetMutation.mutate({
        id: toolset.id,
        data: data as ToolsetUpdate,
      });
    } else {
      createToolsetMutation.mutate(data as ToolsetCreate);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="h-full py-4">
      <FieldGroup className="h-full gap-y-2">
        <Controller
          name="name"
          control={control}
          rules={{
            required: "请输入 Toolset 名称",
            minLength: {
              value: 1,
              message: "名称不能为空",
            },
            maxLength: {
              value: 50,
              message: "名称长度不能超过 50 个字符",
            },
          }}
          render={({ field, fieldState }) => (
            <FieldItem title="名称" fieldState={fieldState}>
              <Input {...field} placeholder="Toolset 名称" />
            </FieldItem>
          )}
        />

        <Controller
          name="type"
          control={control}
          rules={{ required: "请选择 Toolset 类型" }}
          render={({ field, fieldState }) => (
            <FieldItem title="类型" fieldState={fieldState}>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isEditMode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择 Toolset 类型" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TOOLSET_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldItem>
          )}
        />

        {isEditMode && (
          <Controller
            name="is_enabled"
            control={control}
            render={({ field, fieldState }) => (
              <FieldItem title="启用" fieldState={fieldState}>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FieldItem>
            )}
          />
        )}

        {currentType === "mcp_local" && (
          <>
            <Controller
              name="command"
              control={control}
              rules={{ required: "请输入命令" }}
              render={({ field, fieldState }) => (
                <FieldItem title="命令" fieldState={fieldState} align="start">
                  <Input {...field} placeholder="uvx, npx, etc." />
                </FieldItem>
              )}
            />

            <Controller
              name="args"
              control={control}
              render={({ field, fieldState }) => (
                <FieldItem
                  title="参数"
                  description="每行一个参数"
                  fieldState={fieldState}
                  orientation="vertical"
                  align="start"
                >
                  <Textarea
                    {...field}
                    placeholder="例如:&#10;--version&#10;--help"
                    rows={4}
                  />
                </FieldItem>
              )}
            />
          </>
        )}

        {currentType === "mcp_remote" && (
          <>
            <Controller
              name="url"
              control={control}
              rules={{
                required: "请输入 URL",
                pattern: {
                  value: URL_REGEX,
                  message: "请输入有效的 HTTP 或 HTTPS URL",
                },
              }}
              render={({ field, fieldState }) => (
                <FieldItem title="URL" fieldState={fieldState} align="start">
                  <Input
                    {...field}
                    type="url"
                    placeholder="https://api.example.com"
                  />
                </FieldItem>
              )}
            />

            <Controller
              name="http_headers"
              control={control}
              rules={{
                validate: (value) => {
                  if (!value || value.trim() === "") {
                    return true;
                  }
                  try {
                    JSON.parse(value);
                    return true;
                  } catch {
                    return "请输入有效的 JSON 格式";
                  }
                },
              }}
              render={({ field, fieldState }) => (
                <FieldItem
                  title="HTTP Headers"
                  description="JSON 格式的请求头"
                  fieldState={fieldState}
                  orientation="vertical"
                  align="start"
                >
                  <Textarea
                    {...field}
                    placeholder='例如:&#10;{&#10;  "Authorization": "Bearer token"&#10;}'
                    rows={6}
                  />
                </FieldItem>
              )}
            />
          </>
        )}

        {isEditMode && "tools" in toolset && (
          <ToolList toolsetId={toolset.id} tools={toolset.tools} />
        )}

        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {(() => {
              if (isEditMode) {
                return isSubmitting ? "保存中..." : "保存";
              }
              return isSubmitting ? "创建中..." : "创建";
            })()}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
