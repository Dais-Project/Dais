import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import type { ChangeEvent } from "react";
import { useId, useMemo, useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FORM_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";
import type { FieldProps } from ".";

type DateTimeFieldProps = FieldProps<{
  disabled?: boolean;
  required?: boolean;
  className?: string;
  buttonClassName?: string;
  timeInputClassName?: string;
  placeholder?: string;
  timeStep?: number;
  timestampUnit?: "seconds" | "milliseconds";
}>;

function padTimeSegment(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatTimeValue(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }

  return [
    padTimeSegment(date.getHours()),
    padTimeSegment(date.getMinutes()),
    padTimeSegment(date.getSeconds()),
  ].join(":");
}

function getDateFromTimestamp(
  value: number | null | undefined,
  timestampUnit: "seconds" | "milliseconds"
): Date | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  const timestamp = timestampUnit === "seconds" ? value * 1000 : value;
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getTimestampFromDate(
  value: Date,
  timestampUnit: "seconds" | "milliseconds"
): number {
  const timestamp = value.getTime();

  if (timestampUnit === "seconds") {
    return Math.floor(timestamp / 1000);
  }

  return timestamp;
}

function mergeDatePart(currentValue: Date | null | undefined, nextDate: Date): Date {
  const mergedDate = new Date(nextDate);

  if (currentValue) {
    mergedDate.setHours(
      currentValue.getHours(),
      currentValue.getMinutes(),
      currentValue.getSeconds(),
      currentValue.getMilliseconds()
    );
    return mergedDate;
  }

  mergedDate.setHours(0, 0, 0, 0);
  return mergedDate;
}

function mergeTimePart(currentValue: Date | null | undefined, nextTime: string): Date | null {
  const timeSegments = nextTime.split(":");
  const hours = Number(timeSegments[0] ?? 0);
  const minutes = Number(timeSegments[1] ?? 0);
  const seconds = Number(timeSegments[2] ?? 0);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds)
  ) {
    return currentValue ?? null;
  }

  const nextValue = currentValue ? new Date(currentValue) : new Date();
  nextValue.setHours(hours, minutes, seconds, 0);
  return nextValue;
}

export function DateTimeField({
  fieldName,
  fieldProps,
  controlProps,
}: DateTimeFieldProps) {
  const { t } = useTranslation(FORM_NAMESPACE);
  const {
    required = false,
    disabled = false,
    className,
    buttonClassName,
    timeInputClassName,
    placeholder = t("fields.datetime.placeholder"),
    timeStep = 1,
    timestampUnit = "seconds",
  } = controlProps ?? {};
  const { control, getFieldState, formState } = useFormContext<Record<string, number | null>>();
  const { field } = useController({
    name: fieldName,
    control,
    rules: {
      required: required ? t("fields.datetime.validation.required") : false,
    },
  });
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const dateFieldId = `${baseId}-date`;
  const timeFieldId = `${baseId}-time`;
  const { label = t("fields.datetime.label"), contentClassName, ...restFieldProps } = fieldProps ?? {};

  const selectedDate = useMemo(() => {
    return getDateFromTimestamp(field.value, timestampUnit);
  }, [field.value, timestampUnit]);

  function handleDateSelect(nextDate: Date | undefined) {
    if (!nextDate) {
      field.onChange(null);
      setOpen(false);
      return;
    }

    field.onChange(
      getTimestampFromDate(mergeDatePart(selectedDate, nextDate), timestampUnit)
    );
    setOpen(false);
  }

  function handleTimeChange(event: ChangeEvent<HTMLInputElement>) {
    const nextDate = mergeTimePart(selectedDate, event.target.value);

    field.onChange(
      nextDate ? getTimestampFromDate(nextDate, timestampUnit) : null
    );
  }

  return (
    <FieldItem
      {...restFieldProps}
      label={label}
      fieldState={getFieldState(fieldName, formState)}
      contentClassName={cn("max-w-none justify-start", contentClassName)}
    >
      <FieldGroup className={cn("flex-row gap-3", className)}>
        <Field className="min-w-0 flex-1">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id={dateFieldId}
                type="button"
                disabled={disabled}
                className={cn("w-full justify-between font-normal", buttonClassName)}
              >
                {selectedDate ? format(selectedDate, "PPP") : placeholder}
                <ChevronDownIcon className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate ?? undefined}
                captionLayout="dropdown"
                defaultMonth={selectedDate ?? undefined}
                onSelect={handleDateSelect}
              />
            </PopoverContent>
          </Popover>
        </Field>
        <Field className="w-32 shrink-0">
          <Input
            id={timeFieldId}
            type="time"
            step={timeStep}
            value={formatTimeValue(selectedDate)}
            onChange={handleTimeChange}
            onBlur={field.onBlur}
            name={field.name}
            disabled={disabled}
            required={required}
            className={cn(
              "appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
              timeInputClassName
            )}
          />
        </Field>
      </FieldGroup>
    </FieldItem>
  );
}
