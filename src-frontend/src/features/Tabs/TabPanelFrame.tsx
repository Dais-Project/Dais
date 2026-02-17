import type { FallbackProps } from "react-error-boundary";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { ScrollArea } from "@/components/ui/scroll-area";

type TabPanelFrameProps = {
  children: React.ReactNode;
  fallbackChildren: React.ReactNode;
  fallbackRender: (props: FallbackProps) => React.ReactNode;
};

export function TabPanelFrame({
  children,
  fallbackChildren,
  fallbackRender,
}: TabPanelFrameProps) {
  return (
    <AsyncBoundary skeleton={fallbackChildren} errorRender={fallbackRender}>
      <ScrollArea className="h-full px-8">{children}</ScrollArea>
    </AsyncBoundary>
  );
}
