import { useDebounce, useMemoizedFn, useMount, useSize, useUnmount } from "ahooks";
import { useEffect, useRef } from "react";
import VditorType from "vditor";
import "vditor/dist/index.css";
import 'vditor/dist/js/highlight.js/styles/github.min.css';
import { cn } from "@/lib/utils";

const CUSTOM_VDITOR_TOOLBAR = [
  { name: "headings", tipPosition: "se" },
  { name: "bold", tipPosition: "se" },
  { name: "italic", tipPosition: "s" },
  { name: "strike", tipPosition: "s" },
  { name: "link", tipPosition: "s" },
  { name: "list", tipPosition: "s" },
  { name: "ordered-list", tipPosition: "s" },
  { name: "check", tipPosition: "s" },
  { name: "outdent", tipPosition: "s" },
  { name: "indent", tipPosition: "s" },
  { name: "quote", tipPosition: "s" },
  { name: "line", tipPosition: "s" },
  { name: "code", tipPosition: "s" },
  { name: "inline-code", tipPosition: "s" },
  { name: "insert-before", tipPosition: "s" },
  { name: "insert-after", tipPosition: "s" },
  { name: "table", tipPosition: "s" },
  { name: "undo", tipPosition: "s" },
  { name: "redo", tipPosition: "sw" },
  { name: "fullscreen", tipPosition: "sw" },
];

/// <reference types="vditor" />
type SupportedLanguage = keyof II18n;
type SupportedTheme = "light" | "dark";

export type VditorProps = {
  initialValue?: string;
  className?: string;
  placeholder?: string;
  theme?: SupportedTheme;
  lang?: SupportedLanguage;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

export function Vditor({
  initialValue,
  className,
  placeholder,
  theme = "light",
  lang,
  disabled,
  onChange,
}: VditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vditorRef = useRef<VditorType | null>(null);
  const themeRef = useRef<SupportedTheme>(theme);
  const changeHandler = useMemoizedFn((value: string) => onChange?.(value));

  const setVditorTheme = (theme: SupportedTheme) => {
    const isDark = theme === "dark";
    vditorRef.current?.setTheme(
      isDark ? "dark" : "classic",
      isDark ? "dark" : "light",
      isDark ? "dark" : "light",
    );
  };

  const size = useSize(containerRef);
  const debouncedSize = useDebounce(size, { wait: 100 });
  const containerSize = (() => {
    if (!debouncedSize) {
      return "md"; // fallback
    }
    if (debouncedSize.width > 1024) {
      return "lg";
    }
    if (debouncedSize.width > 640) {
      return "md";
    }
    return "sm";
  })();

  useMount(() => {
    const vditor = new VditorType(containerRef.current!, {
      placeholder: placeholder ?? "",
      mode: "ir",
      width: "100%",
      minHeight: 160,
      cdn: "/vditor",
      lang,
      cache: { enable: false },
      value: initialValue,
      toolbar: CUSTOM_VDITOR_TOOLBAR,
      blur: changeHandler,
      after: () => {
        vditorRef.current = vditor;
        setVditorTheme(themeRef.current);
      },
    });
  });

  useUnmount(() => {
    vditorRef.current?.destroy();
  });

  useEffect(() => {
    if (disabled) {
      vditorRef.current?.disabled();
    } else {
      vditorRef.current?.enable();
    }
  }, [disabled]);

  useEffect(() => {
    themeRef.current = theme;
    setVditorTheme(theme);
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "vditor max-h-[60vh] overflow-hidden",
        `vditor-${containerSize}`,
        className
      )}
    />
  );
}
