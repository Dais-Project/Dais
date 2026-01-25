import { Activity } from "react";
import { activityVisible } from "@/lib/activity-visible";
import { cn } from "@/lib/utils";

export type SettingItemProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "start" | "center" | "end";
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
};

export function SettingItem({
  title,
  description,
  children,
  className,
  titleClassName,
  descriptionClassName,
  contentClassName,
  align = "center",
}: SettingItemProps) {
  const alignClassName = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
  }[align];
  return (
    <div
      className={cn(
        "flex justify-between py-2 pr-1.5",
        className,
        alignClassName
      )}
    >
      <div className="space-y-1 pr-4">
        <div className={cn("whitespace-nowrap leading-none", titleClassName)}>
          {title}
        </div>
        <Activity mode={activityVisible(description)}>
          <div
            className={cn(
              "text-muted-foreground text-xs",
              descriptionClassName
            )}
          >
            {description}
          </div>
        </Activity>
      </div>
      <div className={cn("flex items-center", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
