import { BackendReadyPromise } from "@/api";
import { use } from "react";
import { useScheduleNotificationListener } from "../sse-listeners/schedule-notification-listener";
import { useIsMobile } from "@/hooks/use-mobile";
import { Layout as MobileLayout } from "./mobile/Layout";
import { LayoutSkeleton as MobileSkeleton } from "./mobile/Skeleton";
import { Layout as DesktopLayout } from "./desktop/Layout";
import { LayoutSkeleton as DesktopSkeleton } from "./desktop/Skeleton";

export function LayoutSkeleton() {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <MobileSkeleton />;
  } else {
    return <DesktopSkeleton />;
  }
}

export function Layout() {
  use(BackendReadyPromise);

  useScheduleNotificationListener();

  const isMobile = useIsMobile();
  if (isMobile) {
    return <MobileLayout />;
  } else {
    return <DesktopLayout />;
  }
}
