import { PlusIcon } from "lucide-react";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { Button } from "@/components/ui/button";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import type { Tab } from "@/types/tab";
import { ProviderList } from "./ProviderList";
import { ProviderListSkeleton } from "./ProviderListSkeleton";

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
