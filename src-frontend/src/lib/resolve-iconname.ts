import { IconName, iconNames } from "lucide-react/dynamic";

const iconNameSet = new Set(iconNames);
export function resolveIconName(
  name: string | null | undefined,
  fallback: IconName,
): IconName {
  if (iconNameSet.has(name as IconName)) {
    return name as IconName;
  }
  return fallback;
}
