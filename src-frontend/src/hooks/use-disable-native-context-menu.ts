import { useEffect } from "react";

export function useDisableNativeContextMenu() {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("contextmenu", handler);

    return () => {
      document.removeEventListener("contextmenu", handler);
    };
  }, []);
}
