import { useMemoizedFn, useMount, useTheme, useUnmount } from "ahooks";
import { useEffect, useRef } from "react";
import VditorType from "vditor";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";

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

export type VditorProps = {
  initialValue?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

export function Vditor({
  initialValue,
  className,
  placeholder,
  disabled,
  onChange,
}: VditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vditorRef = useRef<VditorType | null>(null);
  const changeHandler = useMemoizedFn((value: string) => onChange?.(value));

  const { current: { theme: themeMode } } = useSettingsStore();
  const { theme, setThemeMode } = useTheme();

  const setVditorTheme = () => {
    const isDark = theme === "dark";
    vditorRef.current?.setTheme(
      isDark ? "dark" : "classic",
      isDark ? "dark" : "light",
      isDark ? "dark" : "light",
    );
  };

  useMount(() => {
    setThemeMode(themeMode);
    const vditor = new VditorType(containerRef.current!, {
      placeholder: placeholder ?? "",
      mode: "ir",
      width: "100%",
      minHeight: 160,
      cache: { enable: false },
      value: initialValue,
      toolbar: CUSTOM_VDITOR_TOOLBAR,
      blur: changeHandler,
      after: () => {
        vditorRef.current = vditor;
        setVditorTheme();
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
    setVditorTheme();
  }, [theme]);

  return (
    <div
      ref={containerRef}
      className={cn("vditor max-h-[60vh] overflow-hidden", className)}
    />
  );
}
