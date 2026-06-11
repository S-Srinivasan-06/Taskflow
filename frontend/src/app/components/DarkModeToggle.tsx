import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-8 h-8" />; // placeholder

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="border-2 border-black w-9 h-9 rounded-full flex items-center justify-center bg-yellow-400 dark:bg-orange-500 hover:bg-orange-500 dark:hover:bg-yellow-400 text-black transition-all shadow-[2px_2px_0px_0px_#000000] dark:shadow-[2px_2px_0px_0px_#ffffff] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none shrink-0"
      title="Toggle Dark Mode"
    >
      {isDark ? <Sun size={16} strokeWidth={3} /> : <Moon size={16} strokeWidth={3} />}
    </button>
  );
}
