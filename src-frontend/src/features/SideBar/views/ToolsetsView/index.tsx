import { PlusIcon } from "lucide-react";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import { tabIdFactory } from "@/lib/tab";
import { useTabsStore } from "@/stores/tabs-store";
import {
  SideBarHeader,
  SideBarHeaderAction,
} from "../../components/SideBarHeader";
import { ToolsetList } from "./ToolsetList";
import { ToolsetListSkeleton } from "./ToolsetListSkeleton";

function openToolsetCreateTab() {
  const addTab = useTabsStore.getState().add;
  addTab({
    id: tabIdFactory(),
    type: "toolset",
    title: "Connect to MCP server",
    metadata: { mode: "create" },
  });
}

export function ToolsetsView() {
  return (
    <div className="flex h-full flex-col">
      <SideBarHeader title="Toolsets">
        <SideBarHeaderAction
          Icon={PlusIcon}
          tooltip="Connect to MCP server"
          onClick={openToolsetCreateTab}
        />
      </SideBarHeader>
      <div className="flex-1">
        <AsyncBoundary
          skeleton={<ToolsetListSkeleton />}
          errorDescription="无法加载 Toolset 列表，请稍后重试。"
        >
          <ToolsetList />
        </AsyncBoundary>
      </div>
    </div>
  );
}
ToolsetsView.componentId = "toolsets";
