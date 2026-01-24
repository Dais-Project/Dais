import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
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
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} fallbackRender={fallbackRender}>
          <Suspense fallback={fallbackChildren}>
            <ScrollArea className="h-full px-8">{children}</ScrollArea>
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
