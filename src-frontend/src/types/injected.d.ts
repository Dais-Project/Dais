type InjectedVars = {
  dev: string;
  server_port: string;
  desktop_auth_token: string;
};

declare global {
  var __INJECTED__: InjectedVars | undefined;
}

export {};
