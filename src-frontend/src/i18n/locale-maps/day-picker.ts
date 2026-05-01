import { Language } from "@/types/common";
import { DayPickerLocale, enUS, zhCN } from "react-day-picker/locale";

export const DAY_PICKER_LOCALES_MAP: Record<Language, DayPickerLocale> = {
  en: enUS,
  zh_CN: zhCN,
};
