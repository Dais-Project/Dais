import { useTranslation } from "react-i18next";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";

type SideBarSearchEmptyProps = {
  query: string;
};

export function SideBarSearchEmpty({ query }: SideBarSearchEmptyProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  return (
    <Empty>
      <EmptyContent>
        <EmptyTitle>{t("search.empty.title")}</EmptyTitle>
        <EmptyDescription>
          {t("search.empty.description", { query })}
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
