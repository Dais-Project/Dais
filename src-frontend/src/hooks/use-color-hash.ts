import { useMemo } from "react";

const AVATAR_COLORS = [
  // 灰色系 (最适合黑白灰应用)
  "bg-zinc-500/10 text-zinc-700 border-zinc-500/20 dark:bg-zinc-500/20 dark:text-zinc-300 dark:border-zinc-500/30",
  "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30",
  "bg-stone-500/10 text-stone-700 border-stone-500/20 dark:bg-stone-500/20 dark:text-stone-300 dark:border-stone-500/30",

  // 冷色系 (冷静、专业)
  "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30",
  "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30",

  // 暖色与自然色 (去掉了刺眼的红黄，保留柔和的玫瑰和青色)
  "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30",
  "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  "bg-teal-500/10 text-teal-700 border-teal-500/20 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-500/30",
  "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30",
];

function getColorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: for hash
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function useColorHash(seed?: undefined): null;
export function useColorHash(seed: string): string;
export function useColorHash(seed?: string): string | null;
export function useColorHash(seed?: string): string | null {
  return useMemo(() => {
    if (!seed) {
      return null;
    }
    return getColorFromName(seed);
  }, [seed]);
}
