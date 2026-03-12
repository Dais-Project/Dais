import { RefreshCcwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { FetchError } from "@/api/orval-mutator/custom-fetch";
import { getErrorMessage } from "@/i18n/error-message";
import { COMPONENTS_CUSTOM_NAMESPACE } from "@/i18n/resources";
import { i18n } from "@/i18n";

type FailedToLoadProps = {
  className?: string;
  retry?: () => void;
  title?: string;
} & MustOneOf<{
  description: string;
  error: unknown;
}>;

export function FailedToLoad({
  className,
  title = i18n.t("load_failed.title", { ns: COMPONENTS_CUSTOM_NAMESPACE }),
  description,
  error,
  retry,
}: FailedToLoadProps) {
  const { t } = useTranslation(COMPONENTS_CUSTOM_NAMESPACE);
  let errorDescription: string;
  if (description) {
    errorDescription = description;
  } else if (error instanceof FetchError) {
    errorDescription = getErrorMessage(error.errorCode);
  } else {
    errorDescription = getErrorMessage("UNEXPECTED_ERROR");
  }

  return (
    <Empty className={className}>
      <EmptyContent>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{errorDescription}</EmptyDescription>
        <EmptyContent>
          <Button size="sm" variant="outline" onClick={() => retry?.()}>
            <RefreshCcwIcon />
            {t("load_failed.retry")}
          </Button>
        </EmptyContent>
      </EmptyContent>
    </Empty>
  );
}
