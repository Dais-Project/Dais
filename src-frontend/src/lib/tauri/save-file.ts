import { isTauri } from ".";
import { toast } from "sonner";
import { i18n } from "@/i18n";
import { TABS_TASK_NAMESPACE } from "@/i18n/resources";

export async function saveFile(filename: string, content: string) {
  if (!isTauri) {
    return;
  }

  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");

  const filePath = await save({
    filters: [{
      name: "Text",
      extensions: ["txt", "md"],
    }],
    defaultPath: filename,
  });

  if (filePath) {
    await writeTextFile(filePath, content);
    toast.success(i18n.t("assistant_message.toast.file_saved", {
      ns: TABS_TASK_NAMESPACE,
    }));
  }
}
