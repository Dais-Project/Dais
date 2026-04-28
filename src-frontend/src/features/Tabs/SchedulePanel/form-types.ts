import type {
  CronConfig,
  DelayedConfig,
  PollingConfig,
  ScheduleCreate,
  ScheduleRead,
  ScheduleUpdate,
} from "@/api/generated/schemas";

export type ScheduleConfigFormValues = {
  type: "cron" | "polling" | "delayed";
  expression?: string;
  interval_sec?: number;
  scheduled_at?: number;
};

export type ScheduleBaseFormValues = {
  name: string;
  task: string;
  agent_id: number | null;
  config: ScheduleConfigFormValues;
};

export type ScheduleCreateFormValues = ScheduleBaseFormValues;

export type ScheduleEditFormValues = ScheduleBaseFormValues & {
  is_enabled: boolean;
};

export function scheduleToEditFormValues(
  schedule: ScheduleRead
): ScheduleEditFormValues {
  return {
    name: schedule.name,
    task: schedule.task,
    is_enabled: schedule.is_enabled,
    agent_id: schedule.agent_id,
    config: scheduleConfigToFormValues(schedule.config),
  } satisfies ScheduleEditFormValues;
}

export function createFormValuesToPayload(
  values: ScheduleCreateFormValues,
  workspaceId: number
): ScheduleCreate {
  return {
    name: values.name,
    task: values.task,
    is_enabled: true,
    agent_id: values.agent_id,
    workspace_id: workspaceId,
    config: transformFormToApiConfig(values.config),
  } satisfies ScheduleCreate;
}

export function editFormValuesToPayload(
  values: ScheduleEditFormValues
): ScheduleUpdate {
  return {
    name: values.name,
    task: values.task,
    is_enabled: values.is_enabled,
    agent_id: values.agent_id,
    config: transformFormToApiConfig(values.config),
  } satisfies ScheduleUpdate;
}

function scheduleConfigToFormValues(
  config: CronConfig | PollingConfig | DelayedConfig
): ScheduleConfigFormValues {
  if (config.type === "cron") {
    return {
      type: config.type,
      expression: config.expression,
    } satisfies ScheduleConfigFormValues;
  }

  if (config.type === "polling") {
    return {
      type: config.type,
      interval_sec: config.interval_sec,
    } satisfies ScheduleConfigFormValues;
  }

  return {
    type: config.type,
    scheduled_at: config.scheduled_at,
  } satisfies ScheduleConfigFormValues;
}

function transformFormToApiConfig(
  config: ScheduleConfigFormValues
): CronConfig | PollingConfig | DelayedConfig {
  if (config.type === "cron") {
    return {
      type: config.type,
      expression: config.expression || "",
    } satisfies CronConfig;
  }

  if (config.type === "polling") {
    return {
      type: config.type,
      interval_sec: config.interval_sec ?? 0,
    } satisfies PollingConfig;
  }

  return {
    type: config.type,
    scheduled_at: config.scheduled_at ?? 0,
  } satisfies DelayedConfig;
}
