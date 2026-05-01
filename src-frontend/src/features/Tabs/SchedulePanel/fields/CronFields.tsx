import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useWatch } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TABS_SCHEDULE_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";
import type {
  ScheduleCreateFormValues,
  ScheduleEditFormValues,
} from "../form-types";

type ScheduleFormValues = ScheduleCreateFormValues | ScheduleEditFormValues;

type IntervalUnit = "hour" | "day" | "week";

type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type ParsedCronExpression = {
  intervalUnit: IntervalUnit;
  intervalValue: number;
  executionMinute: number;
  executionTime: string;
  selectedWeekdays: WeekdayKey[];
};

type CronFieldsProps = {
  disabled: boolean;
  className?: string;
};

const WEEKDAYS: ReadonlyArray<{
  key: WeekdayKey;
  cronValue: string;
}> = [
    { key: "mon", cronValue: "1" },
    { key: "tue", cronValue: "2" },
    { key: "wed", cronValue: "3" },
    { key: "thu", cronValue: "4" },
    { key: "fri", cronValue: "5" },
    { key: "sat", cronValue: "6" },
    { key: "sun", cronValue: "0" },
  ];

const DEFAULT_PARSED_EXPRESSION: ParsedCronExpression = {
  intervalUnit: "week",
  intervalValue: 1,
  executionMinute: 0,
  executionTime: "00:00",
  selectedWeekdays: ["tue"],
};

function clampIntervalValue(intervalUnit: IntervalUnit, value: number) {
  if (intervalUnit === "week") {
    return 1;
  }

  return Math.max(1, value);
}

function clampMinute(value: number) {
  return Math.min(59, Math.max(0, value));
}

function parsePositiveStep(value: string) {
  if (value === "*") {
    return 1;
  }

  if (!value.startsWith("*/")) {
    return null;
  }

  const step = Number.parseInt(value.slice(2), 10);

  if (!Number.isInteger(step) || step <= 0) {
    return null;
  }

  return step;
}

function parseNumberInRange(value: string, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function buildTime(hour: number, minute: number) {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function parseWeekdays(value: string) {
  if (value === "*") {
    return null;
  }

  const normalizedWeekdays = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .map((item) => {
      const matchedWeekday = WEEKDAYS.find(
        (weekday) => weekday.cronValue === item || weekday.key === item
      );

      return matchedWeekday?.key;
    })
    .filter((item): item is WeekdayKey => item !== undefined);

  if (normalizedWeekdays.length === 0) {
    return null;
  }

  return WEEKDAYS.map((weekday) => weekday.key).filter((weekday) =>
    normalizedWeekdays.includes(weekday)
  );
}

function parseCronExpression(expression: string): ParsedCronExpression | null {
  const trimmedExpression = expression.trim();

  if (trimmedExpression === "") {
    return DEFAULT_PARSED_EXPRESSION;
  }

  const parts = trimmedExpression.split(/\s+/);

  if (parts.length !== 5) {
    return null;
  }

  const [minutePart, hourPart, dayPart, monthPart, weekPart] = parts;

  if (monthPart !== "*") {
    return null;
  }

  const minute = parseNumberInRange(minutePart, 0, 59);

  if (minute === null) {
    return null;
  }

  if (dayPart === "*" && weekPart === "*") {
    const intervalValue = parsePositiveStep(hourPart);

    if (intervalValue === null) {
      return null;
    }

    return {
      intervalUnit: "hour",
      intervalValue,
      executionMinute: minute,
      executionTime: buildTime(0, minute),
      selectedWeekdays: DEFAULT_PARSED_EXPRESSION.selectedWeekdays,
    };
  }

  if (weekPart === "*") {
    const hour = parseNumberInRange(hourPart, 0, 23);
    const intervalValue = parsePositiveStep(dayPart);

    if (hour === null || intervalValue === null) {
      return null;
    }

    return {
      intervalUnit: "day",
      intervalValue,
      executionMinute: minute,
      executionTime: buildTime(hour, minute),
      selectedWeekdays: DEFAULT_PARSED_EXPRESSION.selectedWeekdays,
    };
  }

  if (dayPart !== "*") {
    return null;
  }

  const hour = parseNumberInRange(hourPart, 0, 23);
  const selectedWeekdays = parseWeekdays(weekPart);

  if (hour === null || selectedWeekdays === null) {
    return null;
  }

  return {
    intervalUnit: "week",
    intervalValue: 1,
    executionMinute: minute,
    executionTime: buildTime(hour, minute),
    selectedWeekdays,
  };
}

function buildCronExpression(parsed: ParsedCronExpression) {
  if (parsed.intervalUnit === "hour") {
    return `${clampMinute(parsed.executionMinute)} */${clampIntervalValue(parsed.intervalUnit, parsed.intervalValue)} * * *`;
  }

  const [hourPart = "00", minutePart = "00"] = parsed.executionTime.split(":");
  const hour = parseNumberInRange(hourPart, 0, 23) ?? 0;
  const minute = parseNumberInRange(minutePart, 0, 59) ?? 0;

  if (parsed.intervalUnit === "day") {
    return `${minute} ${hour} */${clampIntervalValue(parsed.intervalUnit, parsed.intervalValue)} * *`;
  }

  const weekdays = WEEKDAYS.filter((weekday) => parsed.selectedWeekdays.includes(weekday.key))
    .map((weekday) => weekday.cronValue)
    .join(",");

  if (weekdays === "") {
    return "";
  }

  return `${minute} ${hour} * * ${weekdays}`;
}

export function CronFields({ disabled, className }: CronFieldsProps) {
  const { t } = useTranslation(TABS_SCHEDULE_NAMESPACE);
  const { control, register, setValue } = useFormContext<ScheduleFormValues>();
  const expression = useWatch({ control, name: "config.expression" }) ?? "";
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(
    DEFAULT_PARSED_EXPRESSION.intervalUnit
  );
  const [intervalValue, setIntervalValue] = useState(DEFAULT_PARSED_EXPRESSION.intervalValue);
  const [selectedWeekdays, setSelectedWeekdays] = useState<WeekdayKey[]>(
    DEFAULT_PARSED_EXPRESSION.selectedWeekdays
  );
  const [executionTime, setExecutionTime] = useState(DEFAULT_PARSED_EXPRESSION.executionTime);
  const [executionMinute, setExecutionMinute] = useState(
    DEFAULT_PARSED_EXPRESSION.executionMinute
  );
  const isSyncingFromBuilderRef = useRef(false);
  const emptyFieldState = useMemo(
    () => ({
      invalid: false,
      isDirty: false,
      isTouched: false,
      isValidating: false,
      error: undefined,
    }),
    []
  );

  useEffect(() => {
    if (isSyncingFromBuilderRef.current) {
      isSyncingFromBuilderRef.current = false;
      return;
    }

    const parsed = parseCronExpression(expression);

    if (parsed === null) {
      return;
    }

    setIntervalUnit(parsed.intervalUnit);
    setIntervalValue(parsed.intervalValue);
    setSelectedWeekdays(parsed.selectedWeekdays);
    setExecutionTime(parsed.executionTime);
    setExecutionMinute(parsed.executionMinute);
  }, [expression]);

  function syncBuilderValue(nextValue: ParsedCronExpression) {
    const nextExpression = buildCronExpression(nextValue);

    isSyncingFromBuilderRef.current = true;
    setValue("config.expression", nextExpression, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function handleIntervalValueChange(value: string) {
    const nextValue = clampIntervalValue(
      intervalUnit,
      Number.parseInt(value, 10) || DEFAULT_PARSED_EXPRESSION.intervalValue
    );

    setIntervalValue(nextValue);
    syncBuilderValue({
      intervalUnit,
      intervalValue: nextValue,
      selectedWeekdays,
      executionTime,
      executionMinute,
    });
  }

  function handleIntervalUnitChange(value: string) {
    if (value !== "hour" && value !== "day" && value !== "week") {
      return;
    }

    const nextValue = clampIntervalValue(value, intervalValue);

    setIntervalUnit(value);
    setIntervalValue(nextValue);
    syncBuilderValue({
      intervalUnit: value,
      intervalValue: nextValue,
      selectedWeekdays,
      executionTime,
      executionMinute,
    });
  }

  function toggleWeekday(day: WeekdayKey) {
    const nextSelectedWeekdays = selectedWeekdays.includes(day)
      ? selectedWeekdays.filter((weekday) => weekday !== day)
      : WEEKDAYS.map((weekday) => weekday.key).filter(
        (weekday) => weekday === day || selectedWeekdays.includes(weekday)
      );

    setSelectedWeekdays(nextSelectedWeekdays);
    syncBuilderValue({
      intervalUnit,
      intervalValue,
      selectedWeekdays: nextSelectedWeekdays,
      executionTime,
      executionMinute,
    });
  }

  function handleExecutionMinuteChange(value: string) {
    const nextValue = clampMinute(Number.parseInt(value, 10) || 0);

    setExecutionMinute(nextValue);
    syncBuilderValue({
      intervalUnit,
      intervalValue,
      selectedWeekdays,
      executionTime,
      executionMinute: nextValue,
    });
  }

  function handleExecutionTimeChange(value: string) {
    setExecutionTime(value);
    syncBuilderValue({
      intervalUnit,
      intervalValue,
      selectedWeekdays,
      executionTime: value,
      executionMinute,
    });
  }

  return (
    <FieldGroup className={cn("gap-y-2", className)}>
      <input
        type="hidden"
        {...register("config.expression", {
          required: t("form.config.expression.required"),
          validate: (value) => {
            if (value === undefined || value.trim() === "") {
              return t("form.config.expression.required");
            }
            return true;
          },
        })}
      />

      <FieldItem
        label={t("form.config.builder.repeat_every")}
        fieldState={emptyFieldState}
      >
        <div className="flex gap-2">
          <InputGroup>
            <InputGroupInput
              type="number"
              min={1}
              className="w-24"
              value={intervalValue}
              onChange={(event) => handleIntervalValueChange(event.target.value)}
              disabled={disabled || intervalUnit === "week"}
            />
            <InputGroupAddon align="inline-end">
              <Select
                value={intervalUnit}
                onValueChange={handleIntervalUnitChange}
                disabled={disabled}
              >
                <SelectTrigger className="border-none shadow-none bg-transparent!">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">{t("form.config.builder.unit.hour")}</SelectItem>
                  <SelectItem value="day">{t("form.config.builder.unit.day")}</SelectItem>
                  <SelectItem value="week">{t("form.config.builder.unit.week")}</SelectItem>
                </SelectContent>
              </Select>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </FieldItem>

      {intervalUnit === "week" && (
        <FieldItem
          label={t("form.config.builder.weekdays")}
          fieldState={emptyFieldState}
        >
          <div className="flex flex-wrap gap-1">
            {WEEKDAYS.map((day) => {
              const isSelected = selectedWeekdays.includes(day.key);

              return (
                <Button
                  key={day.key}
                  type="button"
                  variant={isSelected ? "default" : "secondary"}
                  size="sm"
                  onClick={() => toggleWeekday(day.key)}
                  className={cn(
                    "w-9 px-0 text-xs",
                    { "text-muted-foreground hover:bg-muted/80": !isSelected }
                  )}
                  aria-pressed={isSelected}
                  disabled={disabled}
                >
                  {t(`form.config.builder.weekday.${day.key}`)}
                </Button>
              );
            })}
          </div>
        </FieldItem>
      )}

      <FieldItem
        label={
          intervalUnit === "hour"
            ? t("form.config.builder.execution_minute")
            : t("form.config.builder.execution_time")
        }
        fieldState={emptyFieldState}
      >
        {intervalUnit === "hour" ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={59}
              value={executionMinute}
              onChange={(event) => handleExecutionMinuteChange(event.target.value)}
              className="w-20"
              disabled={disabled}
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        ) : (
          <Input
            type="time"
            value={executionTime}
            onChange={(event) => handleExecutionTimeChange(event.target.value)}
            className="w-32"
            disabled={disabled}
          />
        )}
      </FieldItem>
    </FieldGroup>
  );
}
