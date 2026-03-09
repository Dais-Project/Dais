import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { Button } from "@/components/ui/button";
import { i18n } from "@/i18n";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import type { Tab } from "@/types/tab";
import { ProviderList } from "./ProviderList";
import { ProviderListSkeleton } from "./ProviderListSkeleton";

function createProviderCreateTab(): Tab {
  return {
    id: tabIdFactory(),
    type: "provider",
    title: i18n.t("settings.providers.tab.create_title", { ns: "sidebar" }),
    icon: "plug-zap",
    metadata: { mode: "create" },
  };
}

export function ProviderSettings() {
  const { t } = useTranslation("sidebar");
  const addTab = useTabsStore((state) => state.add);

  const handleAddProvider = () => {
    const newTab = createProviderCreateTab();
    addTab(newTab);
  };

  return (
    <div className="flex flex-col">
      <AsyncBoundary
        skeleton={<ProviderListSkeleton />}
        errorDescription={t("settings.providers.list.error_load")}
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
          {t("settings.providers.actions.add")}
        </Button>
      </div>
    </div>
  );
}
