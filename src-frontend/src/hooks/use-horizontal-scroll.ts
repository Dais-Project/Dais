import { useEffect, useRef } from "react";

export function useHorizontalScroll<T extends HTMLElement>() {
  const scrollAreaRef = useRef<T>(null);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const viewport = scrollArea.querySelector(
      "div[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      viewport.scrollLeft += e.deltaY;
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, []);

  return scrollAreaRef;
}
