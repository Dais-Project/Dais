export type ToolsetType = "builtin" | "mcp_local" | "mcp_remote";

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
  internal_key: string;
  is_enabled: boolean;
  auto_approve: boolean;
};

export type ToolUpdate = {
  name?: string;
  is_enabled?: boolean;
  auto_approve?: boolean;
};

export type ToolsetRead = {
  id: number;
  name: string;
  internal_key: string;
  type: ToolsetType;
  // will be null for builtin toolsets
  params: ToolsetParams | null;
  is_enabled: boolean;
  tools: ToolRead[];
};

export type ToolsetCreate = {
  name: string;
  type: ToolsetType;
  params: ToolsetParams;
};

export type ToolsetUpdate = {
  name?: string;
  params?: ToolsetParams;
  is_enabled?: boolean;
};
