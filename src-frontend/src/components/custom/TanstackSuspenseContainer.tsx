import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { FailedToLoad } from "./FailedToLoad";

type TanstackSuspenseContainerProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorDescription: string | ((error: unknown) => string);
};

export function TanstackSuspenseContainer({
  children,
  fallback,
  errorDescription,
}: TanstackSuspenseContainerProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <FailedToLoad
              refetch={resetErrorBoundary}
              description={
                typeof errorDescription === "string"
                  ? errorDescription
                  : errorDescription(error)
              }
            />
          )}
        >
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
