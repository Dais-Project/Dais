import { Activity, type ComponentProps, type ReactNode } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useLocalStorageState } from "ahooks";
import { activityVisible } from "@/lib/activity-visible";
import { cn } from "@/lib/utils";

type SideBarSplitViewProps = {
  children: React.ReactNode;
  className?: string;
};

export function SideBarSplitView({
  children,
  className,
}: SideBarSplitViewProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {children}
    </div>
  );
}

type SideBarPrimarySectionProps = {
  children: ReactNode;
} & ComponentProps<"div">;

export function SideBarPrimarySection({
  children,
  className,
  ...props
}: SideBarPrimarySectionProps) {
  return (
    <div className={cn("min-h-0 flex-1", className)} {...props}>
      {children}
    </div>
  );
}

type SideBarCollapsibleSectionProps = {
  title: string;
  collapsedStateKey: string;
  children?: ReactNode;
} & ComponentProps<"div">;

export function SideBarCollapsibleSection({
  title,
  children,
  className,
  collapsedStateKey,
  ...props
}: SideBarCollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useLocalStorageState(collapsedStateKey, {
    defaultValue: false,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex cursor-pointer items-center gap-1 border-y px-1.5 py-1.5 text-sm font-medium outline-none"
      >
        {isCollapsed ? (
          <ChevronRightIcon className="size-4" />
        ) : (
          <ChevronDownIcon className="size-4" />
        )}
        {title}
      </button>

      <Activity mode={activityVisible(!isCollapsed)}>
        <div className={cn("min-h-0 flex-1", className)} {...props}>
          {children}
        </div>
      </Activity>
    </>
  );
}
