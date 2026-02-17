import { PlusIcon } from "lucide-react";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import type { Tab } from "@/types/tab";
import { ProviderList } from "./ProviderList";

function ProviderListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`provider-skeleton-loading-${Date.now()}-${index}`}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function createProviderCreateTab(): Tab {
  return {
    id: tabIdFactory(),
    type: "provider",
    title: "添加服务提供商",
    icon: "plug-zap",
    metadata: { mode: "create" },
  };
}

export function ProviderSettings() {
  const addTab = useTabsStore((state) => state.add);

  const handleAddProvider = () => {
    const newTab = createProviderCreateTab();
    addTab(newTab);
  };

  return (
    <div className="flex flex-col">
      <AsyncBoundary
        skeleton={<ProviderListSkeleton />}
        errorDescription="无法加载服务提供商列表，请稍后重试。"
      >
        <ProviderList />
      </AsyncBoundary>

      <div className="w-full p-4">
        <Button
          variant="secondary"
          className="w-full"
          onClick={handleAddProvider}
        >
          <PlusIcon className="h-4 w-4" />
          添加
        </Button>
      </div>
    </div>
  );
}
