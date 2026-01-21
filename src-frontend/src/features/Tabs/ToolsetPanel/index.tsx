import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { fetchToolsetById } from "@/api/toolset";
import { FailedToLoad } from "@/components/FailedToLoad";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ToolsetEdit } from "@/features/Tabs/ToolsetPanel/ToolsetEdit";
import { useTabsStore } from "@/stores/tabs-store";
import type { ToolsetTabMetadata } from "@/types/tab";
import type { ToolsetCreate } from "@/types/toolset";
import type { TabPanelProps } from "../index";

const DEFAULT_TOOLSET: ToolsetCreate = {
  name: "",
  type: "mcp_local",
  params: {
    command: "",
    args: [],
  },
};

function ToolsetCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.removeTab);

  const handleComplete = () => {
    removeTab(tabId);
  };

  return <ToolsetEdit toolset={DEFAULT_TOOLSET} onConfirm={handleComplete} />;
}

function ToolsetEditPanel({
  tabId,
  toolsetId,
}: {
  tabId: string;
  toolsetId: number;
}) {
  const removeTab = useTabsStore((state) => state.removeTab);

  const { data: toolset } = useSuspenseQuery({
    queryKey: ["toolset", toolsetId],
    queryFn: async () => await fetchToolsetById(toolsetId),
  });

  const handleComplete = () => {
    removeTab(tabId);
  };

  return <ToolsetEdit toolset={toolset} onConfirm={handleComplete} />;
}

export function ToolsetPanel({
  tabId,
  metadata,
}: TabPanelProps<ToolsetTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <ScrollArea className="h-full px-8">
        <ToolsetCreatePanel tabId={tabId} />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    );
  }

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div className="flex h-full items-center justify-center p-4">
              <FailedToLoad
                refetch={resetErrorBoundary}
                description="无法加载 Toolset 信息，请稍后重试。"
              />
            </div>
          )}
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center p-4">
                <p className="text-muted-foreground">加载中...</p>
              </div>
            }
          >
            <ScrollArea className="h-full px-8">
              <ToolsetEditPanel tabId={tabId} toolsetId={metadata.id} />
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
