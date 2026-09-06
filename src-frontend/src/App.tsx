import { Suspense, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout, LayoutSkeleton } from "@/features/Layouts";
import { GlobalShortcutsProvider } from "@/hooks/use-global-shortcuts";
import sseDispatcher, { SSE_ENDPOINT } from "@/lib/sse-dispatcher";

function App() {
  useEffect(() => {
    sseDispatcher.connect(SSE_ENDPOINT);
    return () => sseDispatcher.disconnect();
  }, []);

  return (
    <TooltipProvider>
      <Suspense fallback={<LayoutSkeleton />}>
        <GlobalShortcutsProvider>
          <Layout />
        </GlobalShortcutsProvider>
      </Suspense>
    </TooltipProvider>
  );
}

export default App;
