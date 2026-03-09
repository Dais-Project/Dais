import type { Locale } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import type { Language } from "@/types/common";

export const DATEFNS_LOCALE_MAP: Record<Language, Locale> = {
  en: enUS,
  zh_CN: zhCN,
};
