import { useEffect, useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon, ClockIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { COMPONENTS_UI_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";

type TimeUnit = "minutes" | "hours" | "days";

type IntervalOption = {
  labelKey: string;
  value: number;
};

type UnitOption = {
  labelKey: string;
  value: TimeUnit;
  multiplier: number;
  options: number[];
};

const PRESET_OPTIONS: IntervalOption[] = [
  { labelKey: "interval_picker.presets.1_minute", value: 1 },
  { labelKey: "interval_picker.presets.5_minutes", value: 5 },
  { labelKey: "interval_picker.presets.10_minutes", value: 10 },
  { labelKey: "interval_picker.presets.30_minutes", value: 30 },
  { labelKey: "interval_picker.presets.1_hour", value: 60 },
  { labelKey: "interval_picker.presets.4_hours", value: 240 },
  { labelKey: "interval_picker.presets.1_day", value: 1440 },
];

const UNIT_OPTIONS: UnitOption[] = [
  {
    labelKey: "interval_picker.units.minutes",
    value: "minutes",
    multiplier: 1,
    options: [1, 2, 3, 5, 10, 15, 20, 30, 45],
  },
  {
    labelKey: "interval_picker.units.hours",
    value: "hours",
    multiplier: 60,
    options: [1, 2, 3, 4, 6, 8, 12],
  },
  {
    labelKey: "interval_picker.units.days",
    value: "days",
    multiplier: 1440,
    options: [1, 2, 3, 5, 7, 14, 30],
  },
];

const DEFAULT_UNIT = "minutes";

interface IntervalPickerProps {
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
}

function formatInterval(minutes: number, t: (key: string, options?: Record<string, number>) => string): string {
  if (minutes % 1440 === 0 && minutes >= 1440) {
    return t("interval_picker.format.days", { count: minutes / 1440 });
  }

  if (minutes % 60 === 0 && minutes >= 60) {
    return t("interval_picker.format.hours", { count: minutes / 60 });
  }

  return t("interval_picker.format.minutes", { count: minutes });
}

function getUnitForValue(value: number): TimeUnit {
  const matchedUnit = UNIT_OPTIONS.find((unitOption) => {
    return unitOption.options.some((option) => option * unitOption.multiplier === value);
  });

  return matchedUnit?.value ?? DEFAULT_UNIT;
}

function isPresetValue(value: number): boolean {
  return PRESET_OPTIONS.some((option) => option.value === value);
}

export function IntervalPicker({ value = 5, onChange, className }: IntervalPickerProps) {
  const { t } = useTranslation(COMPONENTS_UI_NAMESPACE);
  const [open, setOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<TimeUnit>(getUnitForValue(value));

  useEffect(() => {
    setSelectedUnit(getUnitForValue(value));
  }, [value]);

  const currentUnitConfig = useMemo(() => {
    return UNIT_OPTIONS.find((unitOption) => unitOption.value === selectedUnit) ?? UNIT_OPTIONS[0];
  }, [selectedUnit]);

  const selectedCustomValue = useMemo(() => {
    const matchedValue = currentUnitConfig.options.find((option) => {
      return option * currentUnitConfig.multiplier === value;
    });

    return matchedValue?.toString() ?? "";
  }, [currentUnitConfig, value]);

  function handlePresetSelect(nextValue: number) {
    onChange?.(nextValue);
    setOpen(false);
  }

  function handleUnitChange(nextUnit: string) {
    if (nextUnit === "") {
      return;
    }

    const matchedUnit = UNIT_OPTIONS.find((unitOption) => unitOption.value === nextUnit);
    if (!matchedUnit) {
      return;
    }

    setSelectedUnit(matchedUnit.value);

    const nextValue = matchedUnit.options[0];
    if (nextValue === undefined) {
      return;
    }

    onChange?.(nextValue * matchedUnit.multiplier);
  }

  function handleCustomValueChange(nextValue: string) {
    if (nextValue === "") {
      return;
    }

    const parsedValue = Number(nextValue);
    if (Number.isNaN(parsedValue)) {
      return;
    }

    onChange?.(parsedValue * currentUnitConfig.multiplier);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-72 justify-between", className)}
          type="button"
        >
          <span className="flex items-center gap-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            <span>{formatInterval(value, t)}</span>
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="px-1 text-muted-foreground text-xs">
              {t("interval_picker.preset_label")}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {PRESET_OPTIONS.map((option) => {
                const selected = value === option.value;

                return (
                  <Button
                    key={option.value}
                    variant={selected ? "default" : "ghost"}
                    className="justify-between"
                    type="button"
                    onClick={() => handlePresetSelect(option.value)}
                  >
                    <span>{t(option.labelKey)}</span>
                    {selected ? <CheckIcon className="size-4" /> : null}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="border-t" />

          <div className="space-y-2">
            <div className="px-1 text-muted-foreground text-xs">
              {t("interval_picker.custom_label")}
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              className="grid w-full grid-cols-3"
              value={selectedUnit}
              onValueChange={handleUnitChange}
            >
              {UNIT_OPTIONS.map((unitOption) => (
                <ToggleGroupItem key={unitOption.value} value={unitOption.value} className="w-full">
                  {t(unitOption.labelKey)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <ToggleGroup
              type="single"
              variant="outline"
              className="grid w-full grid-cols-4"
              value={isPresetValue(value) ? "" : selectedCustomValue}
              onValueChange={handleCustomValueChange}
            >
              {currentUnitConfig.options.map((option) => (
                <ToggleGroupItem key={option} value={option.toString()} className="w-full">
                  {option}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
