import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeaderSrOnly,
  DialogTrigger
} from "@/components/ui/dialog";

export type { IconName } from "lucide-react/dynamic";

export const AGENT_ICONS: Record<string, IconName[]> = {
  // 1. AI 与 核心功能 (最常用)
  ai_core: [
    "bot",
    "brain",
    "brain-circuit",
    "brain-cog",
    "sparkles",
    "zap",
    "wand",
    "wand-sparkles",
    "ghost",
    "toy-brick", // 代表插件/Plugin
    "blocks",
    "box",
    "component",
    "puzzle",
    "search",
    "globe",
    "command",
    "cpu",
    "microchip",
  ],

  // 2. 编程与技术 (Dev Agents)
  development: [
    "terminal",
    "code",
    "code-xml",
    "bug",
    "bug-off", // 修复 Bug
    "git-branch",
    "git-commit-horizontal",
    "git-merge",
    "git-pull-request",
    "database",
    "database-zap",
    "server",
    "server-cog",
    "cloud",
    "cloud-cog",
    "braces", // JSON
    "brackets", // Array
    "webhook",
    "workflow",
    "container", // Docker
    "file-code",
    "file-json",
    "folder-git",
    "laptop",
    "monitor-cog",
  ],

  // 3. 写作与内容创作 (Writer Agents)
  writing: [
    "pen",
    "pen-tool",
    "feather",
    "book",
    "book-open",
    "notebook",
    "notepad-text",
    "file-text",
    "file-pen",
    "pencil",
    "edit",
    "keyboard",
    "type",
    "pilcrow", // 段落
    "quote",
    "text",
    "text-quote",
    "signature",
    "languages", // 翻译
    "spell-check",
    "newspaper",
    "sticky-note",
  ],

  // 4. 数据与分析 (Data Analyst Agents)
  data: [
    "chart-area",
    "chart-bar",
    "chart-bar-increasing",
    "chart-candlestick", // 股市/金融
    "chart-line",
    "chart-pie",
    "chart-scatter",
    "chart-network",
    "table",
    "table-properties",
    "sheet",
    "file-spreadsheet",
    "calculator",
    "sigma",
    "activity",
    "trending-up",
    "trending-down",
    "binary",
    "radar",
    "presentation",
  ],

  // 5. 办公与生产力 (Assistant Agents)
  productivity: [
    "calendar",
    "calendar-check",
    "clock",
    "timer",
    "alarm-clock",
    "briefcase",
    "mail",
    "inbox",
    "send",
    "paperclip",
    "archive",
    "folder",
    "folder-open",
    "file",
    "files",
    "list",
    "list-todo",
    "check",
    "check-circle",
    "kanban",
    "target",
    "goal",
  ],

  // 6. 媒体与设计 (Creative Agents)
  media: [
    "image",
    "images",
    "image-plus",
    "brush",
    "palette",
    "layers",
    "crop",
    "camera",
    "video",
    "film",
    "clapperboard",
    "mic",
    "mic-vocal",
    "music",
    "headphones",
    "speaker",
    "play",
    "youtube",
    "instagram",
    "figma",
  ],

  // 7. 安全与管理 (Security Agents)
  security: [
    "shield",
    "shield-check",
    "shield-alert",
    "lock",
    "unlock",
    "key",
    "fingerprint",
    "scan-face",
    "eye",
    "eye-off",
    "file-lock",
    "user-cog",
    "construction", // 维护中
  ],

  // 8. 科学与数学 (Academic Agents)
  science: [
    "flask-conical", // 化学/实验
    "test-tube",
    "atom",
    "dna",
    "microscope",
    "telescope",
    "calculator",
    "function-square",
    "variable",
    "radius",
    "ruler",
    "scale",
  ],

  // 9. 生活与角色扮演 (Roleplay Agents)
  lifestyle: [
    "user",
    "users",
    "user-round-cog", // 专家
    "smile",
    "laugh",
    "frown",
    "meh",
    "heart",
    "star",
    "coffee", // 休闲/闲聊
    "cup-soda",
    "beer",
    "pizza",
    "utensils", // 厨师
    "chef-hat",
    "plane", // 旅行助手
    "map",
    "compass",
    "gamepad", // 游戏助手
    "gift",
    "shopping-cart",
    "wallet",
    "piggy-bank", // 理财助手
    "home",
    "dog",
    "cat",
  ],
};

const ICON_GROUP_LABELS: Record<keyof typeof AGENT_ICONS, string> = {
  ai_core: "AI 与核心功能",
  development: "编程与技术",
  writing: "写作与内容创作",
  data: "数据与分析",
  productivity: "办公与生产力",
  media: "媒体与设计",
  security: "安全与管理",
  science: "科学与数学",
  lifestyle: "生活与角色扮演",
};

type IconSelectDialogProps = {
  value: IconName | null;
  onChange: (iconName: IconName) => void;
};

export function IconSelectDialog({ value, onChange }: IconSelectDialogProps) {
  const [open, setOpen] = useState(false);

  const iconGroups = useMemo(
    () =>
      Object.entries(AGENT_ICONS).map(([key, items]) => ({
        heading: ICON_GROUP_LABELS[key as keyof typeof AGENT_ICONS],
        items,
      })),
    []
  );

  const handleChange = (iconName: IconName) => {
    onChange(iconName);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogHeaderSrOnly title="选择图标" description="搜索图标..." />

      <DialogTrigger asChild>
        <Button variant="outline" size={value ? "icon" : "default"}>
          {value ? <DynamicIcon name={value} /> : "选择图标"}
        </Button>
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="max-w-2xl p-0">
        <Command value={value ?? undefined}>
          <CommandInput placeholder="搜索图标..." />
          <CommandList className="shadcn-scroll max-h-100">
            {iconGroups.map((group, index) => (
              <div key={group.heading}>
                <CommandGroup heading={group.heading} className="p-2">
                  <div className="grid grid-cols-8 gap-2">
                    {group.items.map((iconName) => (
                      <CommandItem
                        key={iconName}
                        value={iconName}
                        onSelect={() => handleChange(iconName)}
                        className="group size-12 justify-center p-0"
                      >
                        <DynamicIcon
                          name={iconName}
                          className="size-6 text-muted-foreground group-data-[selected=true]:text-primary"
                        />
                      </CommandItem>
                    ))}
                  </div>
                </CommandGroup>
                {index < iconGroups.length - 1 && <CommandSeparator />}
              </div>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
