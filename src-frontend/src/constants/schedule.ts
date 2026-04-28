import type { ScheduleCreateFormValues } from "@/features/Tabs/SchedulePanel/form-types";

export const DEFAULT_SCHEDULE_CREATE_FORM_VALUES: ScheduleCreateFormValues = {
  name: "",
  task: "",
  agent_id: null,
  config: {
    type: "cron",
    expression: "",
  },
};
