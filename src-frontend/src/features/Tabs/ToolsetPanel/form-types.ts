import type {
  LocalServerParams,
  RemoteServerParams,
  ToolRead,
  ToolsetCreate,
  ToolsetRead,
  ToolsetType,
  ToolsetUpdate,
  ToolUpdate,
} from "@/api/generated/schemas";
import { headersToObject, KeyValuePair, objectToHeaders } from "@/components/ui/key-value-editor";

export type ToolFormValues = Omit<ToolRead, "toolset_id" | "internal_key">;

export type ToolsetBaseFormValues = {
  name: string;
  type: ToolsetType;
  is_enabled: boolean;

  params: {
    // === Local MCP fields ===
    command?: string;
    args?: string[];

    // === Remote MCP fields ===
    url?: string;
    http_headers?: KeyValuePair[];
  };
};

export type ToolsetCreateFormValues = ToolsetBaseFormValues;

export type ToolsetEditFormValues = ToolsetBaseFormValues & {
  tools: ToolFormValues[];
};

// --- --- --- --- --- ---

export function toolsetToEditFormValues(
  toolset: ToolsetRead
): ToolsetEditFormValues {
  const params: ToolsetEditFormValues["params"] = {};

  if (toolset.type === "mcp_local" && toolset.params) {
    const p = toolset.params as LocalServerParams;
    params.command = p.command;
    params.args = p.args || [];
  } else if (toolset.type === "mcp_remote" && toolset.params) {
    const p = toolset.params as RemoteServerParams;
    params.url = p.url;
    params.http_headers = objectToHeaders(p.http_headers ?? {});
  }

  return {
    name: toolset.name,
    type: toolset.type,
    is_enabled: toolset.is_enabled,
    params,
    tools: toolset.tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      is_enabled: tool.is_enabled,
      auto_approve: tool.auto_approve,
    })),
  } satisfies ToolsetEditFormValues;
}

export function createFormValuesToPayload(
  values: ToolsetCreateFormValues
): ToolsetCreate {
  return {
    name: values.name,
    type: values.type,
    params: transformFormToApiParams(values),
  } as ToolsetCreate;
}

export function editFormValuesToPayload(
  values: ToolsetEditFormValues
): ToolsetUpdate {
  return {
    name: values.name,
    type: values.type,
    is_enabled: values.is_enabled,
    params: transformFormToApiParams(values),
    tools: values.tools.map(
      (t) =>
        ({
          id: t.id,
          name: t.name,
          is_enabled: t.is_enabled,
          auto_approve: t.auto_approve,
        }) satisfies ToolUpdate
    ),
  } as ToolsetUpdate;
}

function transformFormToApiParams(
  values: ToolsetBaseFormValues
): LocalServerParams | RemoteServerParams | null {
  // case 1: Local MCP
  if (values.type === "mcp_local") {
    return {
      command: values.params.command || "",
      args: values.params.args,
    } satisfies LocalServerParams;
  }

  // case 2: Remote MCP
  if (values.type === "mcp_remote") {
    let httpHeaders: Record<string, string> = {};
    if (values.params.http_headers) {
      httpHeaders = headersToObject(values.params.http_headers);
    }
    return {
      url: values.params.url || "",
      http_headers: httpHeaders,
      bearer_token: null,
      oauth_params: null,
    } satisfies RemoteServerParams;
  }
  // case 3: Built-in (no params)
  return null;
}
