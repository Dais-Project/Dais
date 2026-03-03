import { SettingItem } from "@/components/custom/item/SettingItem";
import { Button } from "@/components/ui/button";
import { openDevtools } from "@/lib/tauri";
import { useThrottleFn } from "ahooks";

export function DevSettings() {
  const { run: throttledOpenDevtools } = useThrottleFn(openDevtools, { wait: 300 });
  return (
    <div className="px-4 py-2">
      <SettingItem title="开发者工具">
        <Button type="button" variant="outline" onClick={throttledOpenDevtools}>
          打开
        </Button>
      </SettingItem>
    </div>
  );
}
