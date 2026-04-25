import type {
  CronConfig,
  DelayedConfig,
  PollingConfig,
  ScheduleCreate,
  ScheduleRead,
  ScheduleUpdate,
} from "@/api/generated/schemas";

export type ScheduleType = "cron" | "polling" | "delayed";

export type ScheduleCreateFormValues = {
  name: string;
  task: string;
  agent_id: string;
  is_enabled: boolean;
  
  // config fields
  type: ScheduleType;
  expression: string;
  interval_sec: number;
  run_at: string;
};

export type ScheduleEditFormValues = ScheduleCreateFormValues;

function toDatetimeLocal(timestampSec: number): string {
  const date = new Date(timestampSec * 1000);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function configToFormValues(config: CronConfig | PollingConfig | DelayedConfig) {
  switch (config.type) {
    case "cron":
      return {
        type: "cron" as const,
        expression: config.expression,
        interval_sec: 60,
        run_at: "",
      };
    case "polling":
      return {
        type: "polling" as const,
        expression: "",
        interval_sec: config.interval_sec,
        run_at: "",
      };
    case "delayed":
      return {
        type: "delayed" as const,
        expression: "",
        interval_sec: 60,
        run_at: toDatetimeLocal(config.run_at),
      };
  }
}

export function scheduleToEditFormValues(schedule: ScheduleRead): ScheduleEditFormValues {
  const configValues = configToFormValues(schedule.config);

  return {
    name: schedule.name,
    task: schedule.task,
    is_enabled: schedule.is_enabled,
    agent_id: schedule.agent_id === null ? "" : String(schedule.agent_id),
    ...configValues,
  };
}

function valuesToConfig(
  values: Pick<ScheduleCreateFormValues, "type" | "expression" | "interval_sec" | "run_at">,
): CronConfig | PollingConfig | DelayedConfig {
  switch (values.type) {
    case "cron":
      return {
        type: "cron",
        expression: values.expression,
      };
    case "polling":
      return {
        type: "polling",
        interval_sec: values.interval_sec,
      };
    case "delayed":
      return {
        type: "delayed",
        run_at: Math.floor(new Date(values.run_at).getTime() / 1000),
      };
  }
}

function valuesToAgentId(agentId: string): number | null {
  const trimmedValue = agentId.trim();
  if (trimmedValue.length === 0) {
    return null;
  }
  return Number(trimmedValue);
}

export function createFormValuesToPayload(
  values: ScheduleCreateFormValues,
  workspaceId: number,
): ScheduleCreate {
  return {
    name: values.name,
    task: values.task,
    is_enabled: values.is_enabled,
    config: valuesToConfig(values),
    agent_id: valuesToAgentId(values.agent_id),
    workspace_id: workspaceId,
  };
}

export function editFormValuesToPayload(values: ScheduleEditFormValues): ScheduleUpdate {
  return {
    name: values.name,
    task: values.task,
    is_enabled: values.is_enabled,
    config: valuesToConfig(values),
    agent_id: valuesToAgentId(values.agent_id),
  };
}
