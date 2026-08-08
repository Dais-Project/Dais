import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { TabIndicator as TabIndicatorStatus } from "@/stores/tabs-store";

const TAB_INDICATOR_VARIANTS = {
  "in-progress": "bg-info animate-pulse",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
} satisfies Record<TabIndicatorStatus, string>;

const tabIndicatorVariants = cva(
  "absolute right-0 bottom-0 size-2 translate-x-1/4 translate-y-1/4 rounded-full border border-background",
  {
    variants: {
      indicator: TAB_INDICATOR_VARIANTS,
    },
  }
);

type TabIndicatorProps = Omit<React.ComponentProps<"span">, "aria-hidden"> & {
  indicator: TabIndicatorStatus;
};

export function TabIndicator({ indicator, className, ...props }: TabIndicatorProps) {
  return <span {...props} aria-hidden className={cn(tabIndicatorVariants({ indicator }), className)} />;
}
