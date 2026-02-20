import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { FailedToLoad } from "./FailedToLoad";

type AsyncBoundaryProps = {
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  onError?: (error: unknown, info: React.ErrorInfo) => void;
} & MustOneOf<{
  errorDescription: string | ((error: unknown) => string);
  errorRender: (props: FallbackProps) => React.ReactNode;
}>;

export function AsyncBoundary({
  children,
  skeleton,
  onError,
  errorDescription,
  errorRender,
}: AsyncBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          onError={onError}
          fallbackRender={
            errorRender ??
            ((props) => (
              <FailedToLoad
                refetch={props.resetErrorBoundary}
                description={
                  typeof errorDescription === "string"
                    ? errorDescription
                    : errorDescription(props.error)
                }
              />
            ))
          }
        >
          <Suspense fallback={skeleton}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
