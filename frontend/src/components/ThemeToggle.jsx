import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      data-testid="btn-theme-toggle"
      className={`relative flex items-center justify-center rounded-lg border transition ${
        compact ? "w-9 h-9" : "w-9 h-9"
      } ${isDark
        ? "bg-slate-900/70 border-violet-500/20 text-amber-300 hover:border-fuchsia-500/40"
        : "bg-white border-violet-300 text-violet-700 hover:border-fuchsia-500 shadow-sm"}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
