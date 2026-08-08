import { BackendReadyPromise } from "@/api";
import { use } from "react";
import { useResponsive } from "ahooks";
import { useScheduleNotificationListener } from "../sse-listeners/schedule-notification-listener";
import { Layout as MobileLayout } from "./mobile/Layout";
import { LayoutSkeleton as MobileSkeleton } from "./mobile/Skeleton";
import { Layout as DesktopLayout } from "./desktop/Layout";
import { LayoutSkeleton as DesktopSkeleton } from "./desktop/Skeleton";

export function LayoutSkeleton() {
  const responsive = useResponsive();
  const isMobile = responsive.sm && !responsive.md;
  if (isMobile) {
    return <MobileSkeleton />;
  } else {
    return <DesktopSkeleton />;
  }
}

export function Layout() {
  use(BackendReadyPromise);
  useScheduleNotificationListener();

  const responsive = useResponsive();
  const isMobile = responsive.sm && !responsive.md;
  if (isMobile) {
    return <MobileLayout />;
  } else {
    return <DesktopLayout />;
  }
}
