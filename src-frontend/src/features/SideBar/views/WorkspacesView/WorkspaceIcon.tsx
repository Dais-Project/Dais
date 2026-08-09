import { Clock3Icon, FolderIcon } from "lucide-react";
import { WorkspaceItemVariant } from "./types";

export function WorkspaceIcon({ variant }: { variant: WorkspaceItemVariant }) {
  switch (variant) {
    case "current":
      return <FolderIcon fill="currentColor" className="size-4" />;
    case "frequent":
      return <Clock3Icon className="size-4" />;
    default:
      return <FolderIcon className="size-4" />;
  }
}