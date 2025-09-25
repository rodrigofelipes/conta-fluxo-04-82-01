import { Moon, Sun } from "lucide-react";
import { useThemeWithDatabase } from "@/hooks/useThemeWithDatabase";

export function ThemeToggle() {
  const { setTheme, theme } = useThemeWithDatabase();

  const handleToggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-accent transition-all"
      aria-label="Alternar tema"
    >
      <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}