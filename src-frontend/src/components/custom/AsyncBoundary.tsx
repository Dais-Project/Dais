import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { FailedToLoad } from "./FailedToLoad";

type AsyncBoundaryProps = {
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  errorRender?: (props: FallbackProps) => React.ReactNode;
  onError?: (error: unknown, info: React.ErrorInfo) => void;
};

export function AsyncBoundary({
  children,
  skeleton,
  onError,
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
                error={props.error}
                retry={props.resetErrorBoundary}
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
