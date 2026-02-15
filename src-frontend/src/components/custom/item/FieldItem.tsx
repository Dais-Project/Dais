import type { ControllerFieldState } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type FieldItemProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  fieldState: ControllerFieldState;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  orientation?: "vertical" | "horizontal";
};

export function FieldItem({
  title,
  description,
  children,
  fieldState,
  className,
  titleClassName,
  descriptionClassName,
  contentClassName,
  align = "center",
  orientation = "horizontal",
}: FieldItemProps) {
  // TODO: use cva
  const alignClassName = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
  }[align];
  return (
    <Field
      className={cn(
        "flex justify-between py-2 pr-1.5",
        {
          "flex-col": orientation === "vertical",
          "flex-row": orientation === "horizontal",
        },
        className,
        alignClassName
      )}
      data-invalid={fieldState.invalid}
    >
      <div className="space-y-1 pr-4">
        <FieldLabel
          className={cn("whitespace-nowrap leading-none", titleClassName)}
        >
          {title}
        </FieldLabel>
        {description && (
          <div
            className={cn(
              "text-muted-foreground text-xs",
              descriptionClassName
            )}
          >
            {description}
          </div>
        )}
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </div>
      <div className={cn("flex items-center justify-end", contentClassName)}>
        {children}
      </div>
    </Field>
  );
}
