"use client";

import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COMPONENTS_AI_ELEMENTS_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("group not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

export type ToolHeaderProps = {
  toolName: string;
  toolsetName?: string;
  className?: string;
  state: ToolState;
  riskLevel?: number;
  riskReason?: string;
};

export const getStatusBadge = (status: ToolState) => {
  const { t } = useTranslation(COMPONENTS_AI_ELEMENTS_NAMESPACE);
  const labels: Record<ToolState, string> = {
    "input-streaming": t("status.input_streaming"),
    "input-available": t("status.input_available"),
    "approval-requested": t("status.approval_requested"),
    "approval-responded": t("status.approval_responded"),
    "output-available": t("status.output_available"),
    "output-error": t("status.output_error"),
    "output-denied": t("status.output_denied"),
  };

  const icons: Record<ToolState, ReactNode> = {
    "input-streaming": <CircleIcon className="size-4" />,
    "input-available": <ClockIcon className="size-4 animate-pulse" />,
    "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
    "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
    "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
    "output-error": <XCircleIcon className="size-4 text-red-600" />,
    "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  };

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

type RiskBadgeProps = {
  riskLevel: number;
  riskReason?: string;
};

export function RiskBadge({ riskLevel, riskReason }: RiskBadgeProps) {
  const { t } = useTranslation(COMPONENTS_AI_ELEMENTS_NAMESPACE);
  const normalizedRisk = Math.min(
    100,
    Math.max(0, Math.ceil(riskLevel / 10) * 10)
  );

  const configs = [
    {
      label: t("risk.safe"),
      range: [0, 20],
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    },
    {
      label: t("risk.mostly_safe"),
      range: [30, 50],
      className: "bg-lime-50 text-lime-700 dark:bg-lime-950/60 dark:text-lime-400",
    },
    {
      label: t("risk.risky"),
      range: [60, 70],
      className: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400",
    },
    {
      label: t("risk.dangerous"),
      range: [80, 100],
      className: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400",
    },
  ] as const;

  const match = configs.find(
    (config) =>
      normalizedRisk >= config.range[0] && normalizedRisk <= config.range[1]
  );

  if (!match) {
    return null;
  }

  const badge = (
    <Badge className={match.className}>
      {match.label} {normalizedRisk}
    </Badge>
  );

  if (!riskReason) {
    return badge;
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent align="end">{riskReason}</TooltipContent>
    </Tooltip>
  );
}

export type ToolBreadcrumbProps = {
  toolsetName?: string;
  toolName: string;
};

export const ToolBreadcrumb = ({
  toolsetName,
  toolName,
}: ToolBreadcrumbProps) => (
  <>
    {toolsetName && (
      <>
        <span className="font-medium text-muted-foreground text-sm">
          {toolsetName}
        </span>
        <span className="text-muted-foreground/40">/</span>
      </>
    )}
    <span className="font-medium text-sm">{toolName}</span>
  </>
);

export const ToolHeader = ({
  className,
  toolsetName,
  state,
  toolName,
  riskLevel,
  riskReason,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      "flex w-full cursor-pointer items-center justify-between gap-4 p-3",
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      <WrenchIcon className="size-4 text-muted-foreground" />
      <ToolBreadcrumb toolsetName={toolsetName} toolName={toolName} />
      {getStatusBadge(state)}
    </div>
    <div className="flex items-center gap-2">
      {(typeof riskLevel === "number") && (
        <RiskBadge riskLevel={riskLevel} riskReason={riskReason} />
      )}
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </div>
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: unknown;
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => {
  const { t } = useTranslation(COMPONENTS_AI_ELEMENTS_NAMESPACE);

  return (
    <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {t("labels.parameters")}
      </h4>
      <div className="rounded-md bg-muted/50">
        <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
      </div>
    </div>
  );
};

export type ToolOutputProps = ComponentProps<"div"> & {
  output: unknown | null;
  errorText: string | null;
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  const { t } = useTranslation(COMPONENTS_AI_ELEMENTS_NAMESPACE);

  if (!(output !== null || errorText !== null)) {
    return null;
  }

  const isError = errorText !== null;

  const Output = () => {
    if (typeof output === "object" && !isValidElement(output)) {
      return (
        <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
      );
    } else if (typeof output === "string") {
      return <CodeBlock code={output} language="json" />;
    } else {
      return <div>{output as ReactNode}</div>;
    }
  };

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {isError ? t("labels.error") : t("labels.result")}
      </h4>
      {isError && <ToolError error={errorText} />}
      {!isError && Output()}
    </div>
  );
};

export type ToolErrorProps = ComponentProps<"pre"> & {
  error: string;
};

export function ToolError({ error, className, ...props }: ToolErrorProps) {
  return (
    <pre className={cn(
      "shadcn-scroll-horizontal overflow-x-auto p-4 [&_table]:w-full",
      "rounded-md border border-destructive/20 bg-destructive/10 text-destructive text-xs", className,
    )} {...props}>
      {error.replace(/\\n/g, "\n")}
    </pre>
  );
}
