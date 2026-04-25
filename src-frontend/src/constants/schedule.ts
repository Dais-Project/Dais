import type { ScheduleCreateFormValues } from "@/features/Tabs/SchedulePanel/form-types";

export const DEFAULT_SCHEDULE_CREATE_FORM_VALUES: ScheduleCreateFormValues = {
  name: "",
  task: "",
  type: "cron",
  expression: "",
  interval_sec: 60,
  run_at: "",
  agent_id: "",
  is_enabled: true,
};
