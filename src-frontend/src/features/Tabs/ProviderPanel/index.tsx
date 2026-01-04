import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { fetchProviderById } from "@/api/provider";
import { FailedToLoad } from "@/components/FailedToLoad";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DEFAULT_PROVIDER } from "@/constants/provider";
import { ProviderEdit } from "@/features/Tabs/ProviderPanel/ProviderEdit";
import { useTabsStore } from "@/stores/tabs-store";
import type { ProviderTabMetadata } from "@/types/tab";
import type { TabPanelProps } from "../index";

function ProviderCreatePanel({ tabId }: { tabId: string }) {
  const removeTab = useTabsStore((state) => state.removeTab);

  const handleComplete = () => {
    removeTab(tabId);
  };

  return (
    <ProviderEdit provider={DEFAULT_PROVIDER} onConfirm={handleComplete} />
  );
}

function ProviderEditPanel({
  tabId,
  providerId,
}: {
  tabId: string;
  providerId: number;
}) {
  const removeTab = useTabsStore((state) => state.removeTab);

  const { data: provider } = useSuspenseQuery({
    queryKey: ["provider", providerId],
    queryFn: async () => await fetchProviderById(providerId),
  });

  const handleComplete = () => {
    removeTab(tabId);
  };

  return <ProviderEdit provider={provider} onConfirm={handleComplete} />;
}

export function ProviderPanel({
  tabId,
  metadata,
}: TabPanelProps<ProviderTabMetadata>) {
  if (metadata.mode === "create") {
    return (
      <ScrollArea className="h-full px-8">
        <ProviderCreatePanel tabId={tabId} />
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
                description="无法加载服务提供商信息，请稍后重试。"
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
              <ProviderEditPanel tabId={tabId} providerId={metadata.id} />
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
