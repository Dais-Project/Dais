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

function getTheme(isDark: boolean): {
  theme: "dark" | "classic";
  contentTheme: "dark" | "light";
  codeTheme: string;
} {
  return {
    theme: isDark ? "dark" : "classic",
    contentTheme: isDark ? "dark" : "light",
    codeTheme: isDark ? "github-dark" : "github",
  }
}

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
  const changeHandler = useMemoizedFn((value: string) => onChange?.(value));

  const setVditorTheme = (theme: SupportedTheme) => {
    const themes = getTheme(theme === "dark");
    vditorRef.current?.setTheme(
      themes.theme,
      themes.contentTheme,
      themes.codeTheme,
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
    const themes = getTheme(theme === "dark");
    const vditor = new VditorType(containerRef.current!, {
      placeholder: placeholder ?? "",
      mode: "ir",
      width: "100%",
      minHeight: 240,
      cdn: "/vditor",
      lang,
      theme: themes.theme,
      preview: {
        theme: {
          current: themes.contentTheme,
        },
        hljs: {
          style: themes.codeTheme,
        },
      },
      cache: { enable: false },
      value: initialValue,
      toolbar: CUSTOM_VDITOR_TOOLBAR,
      blur: changeHandler,
      after: () => vditorRef.current = vditor,
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
    setVditorTheme(theme);
  }, [theme]);

  return (
    <div className={cn("w-full", `vditor-${containerSize}`, className)}>
      <div ref={containerRef} className="vditor max-h-[60vh] overflow-hidden"></div>
    </div>
  );
}
