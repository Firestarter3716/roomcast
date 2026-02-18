"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `theme=${next};path=/;max-age=31536000;SameSite=Lax`;
    setTheme(next);
  }

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center" />
    );
  }

  const Icon = theme === "light" ? Moon : Sun;
  const label =
    theme === "light" ? "Switch to dark mode" : "Switch to light mode";

  return (
    <button
      onClick={toggle}
      className="rounded-md p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
      aria-label={label}
      title={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
