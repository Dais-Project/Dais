import type {
  LocalServerParams,
  RemoteServerParams,
  ToolRead,
  ToolsetCreate,
  ToolsetRead,
  ToolsetType,
  ToolsetUpdate,
  ToolUpdate,
} from "@/types/toolset";

export type ToolFormValues = Omit<ToolRead, "toolset_id" | "internal_key">;

export type ToolsetBaseFormValues = {
  name: string;
  type: ToolsetType;
  is_enabled: boolean;

  params: {
    // === Local MCP fields ===
    command?: string;
    args?: string;

    // === Remote MCP fields ===
    url?: string;
    http_headers?: string;
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
    params.args = p.args?.join("\n") || "";
  } else if (toolset.type === "mcp_remote" && toolset.params) {
    const p = toolset.params as RemoteServerParams;
    params.url = p.url;
    params.http_headers = p.http_headers
      ? JSON.stringify(p.http_headers, null, 2)
      : "";
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
      // multiline string -> array (trim whitespace, remove empty lines)
      args: values.params.args
        ? values.params.args
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s !== "")
        : [],
    } satisfies LocalServerParams;
  }

  // case 2: Remote MCP
  if (values.type === "mcp_remote") {
    let httpHeaders: Record<string, string> | undefined;
    // JSON string -> object
    if (values.params.http_headers?.trim()) {
      try {
        httpHeaders = JSON.parse(values.params.http_headers);
      } catch (e) {
        console.error("Failed to parse headers JSON", e);
      }
    }
    return {
      url: values.params.url || "",
      http_headers: httpHeaders,
    } satisfies RemoteServerParams;
  }
  // case 3: Built-in (no params)
  return null;
}
