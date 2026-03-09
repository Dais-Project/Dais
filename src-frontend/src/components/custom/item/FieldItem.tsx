import { cva, type VariantProps } from "class-variance-authority";
import type { ControllerFieldState } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const fieldItemVariants = cva("flex justify-between py-2", {
  variants: {
    orientation: {
      vertical: "flex-col",
      horizontal: "flex-row",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    align: "center",
  },
});

export type FieldItemProps = {
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  fieldState: ControllerFieldState;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
} & VariantProps<typeof fieldItemVariants>;

export function FieldItem({
  label,
  description,
  children,
  fieldState,
  className,
  titleClassName,
  descriptionClassName,
  contentClassName,
  align,
  orientation = "horizontal",
}: FieldItemProps) {
  return (
    <Field
      orientation={orientation}
      className={cn(fieldItemVariants({ orientation, align }), className)}
      data-invalid={fieldState.invalid}
    >
      <div className="space-y-1 pr-4">
        <FieldLabel
          className={cn("whitespace-nowrap leading-none", titleClassName)}
        >
          {label}
        </FieldLabel>
        {description && (
          <FieldDescription className={descriptionClassName}>
            {description}
          </FieldDescription>
        )}
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </div>
      <div className={cn(
        "flex items-center justify-end",
        { "w-full max-w-xs": orientation === "horizontal" },
        contentClassName
      )}>
        {children}
      </div>
    </Field>
  );
}
