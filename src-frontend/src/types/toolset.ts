export type McpToolsetStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type LocalServerParams = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  encoding?: string;
  encoding_error_handler?: "strict" | "ignore" | "replace";
};

export type OAuthParams = {
  oauth_scopes?: string[];
  oauth_timeout?: number;
};

export type RemoteServerParams = {
  url: string;
  bearer_token?: string;
  oauth_params?: OAuthParams;
  http_headers?: Record<string, string>;
};

export type ToolsetParams = LocalServerParams | RemoteServerParams;

export type ToolsetType = ToolsetBase["type"];

export type ToolsetBrief = {
  id: number;
  name: string;
  type: ToolsetType;
  // only available for MCP toolsets
  status: McpToolsetStatus | null;
};

export type ToolRead = {
  id: number;
  toolset_id: number;
  name: string;
  description: string;
  internal_key: string;
  is_enabled: boolean;
  auto_approve: boolean;
};

export type ToolUpdate = {
  id: number;
  name?: string;
  is_enabled?: boolean;
  auto_approve?: boolean;
};

export type ToolsetBase = {
  name: string;
} & (
  | { type: "built_in"; params: null }
  | { type: "mcp_local"; params: LocalServerParams }
  | { type: "mcp_remote"; params: RemoteServerParams }
);

export type ToolsetRead = ToolsetBase & {
  id: number;
  internal_key: string;
  is_enabled: boolean;
  tools: ToolRead[];
};

export type ToolsetCreate = ToolsetBase;

export type ToolsetUpdate = Partial<
  ToolsetBase & {
    is_enabled: boolean;
    tools: ToolUpdate[];
  }
>;
