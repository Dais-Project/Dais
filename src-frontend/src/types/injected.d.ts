type InjectedVars = {
  dev: string;
  server_port: string;
};

declare global {
  var __INJECTED__: InjectedVars | undefined;
}

export {};
