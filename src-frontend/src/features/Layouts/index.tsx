import { BackendReadyPromise } from "@/api";
import { use } from "react";
import { useResponsive } from "ahooks";
import { useScheduleNotificationListener } from "../sse-listeners/schedule-notification-listener";
import { Layout as MobileLayout } from "./mobile/Layout";
import { LayoutSkeleton as MobileSkeleton } from "./mobile/Skeleton";
import { Layout as DesktopLayout } from "./desktop/Layout";
import { LayoutSkeleton as DesktopSkeleton } from "./desktop/Skeleton";

const isMobile = (responsive: ReturnType<typeof useResponsive>) =>
  (responsive.xs || responsive.sm) && !responsive.md;

export function LayoutSkeleton() {
  const responsive = useResponsive();
  if (isMobile(responsive)) {
    return <MobileSkeleton />;
  } else {
    return <DesktopSkeleton />;
  }
}

export function Layout() {
  use(BackendReadyPromise);
  useScheduleNotificationListener();

  const responsive = useResponsive();
  console.log(responsive);
  if (isMobile(responsive)) {
    return <MobileLayout />;
  } else {
    return <DesktopLayout />;
  }
}
