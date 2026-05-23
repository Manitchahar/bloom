"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  LayoutGrid,
  Plus,
  BarChart3,
  BookOpen,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/improve", label: "Improve", icon: BarChart3 },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  const moveIndicator = useCallback(() => {
    if (!navRef.current || !indicatorRef.current) return;
    const activeBtn = navRef.current.querySelector(
      "[data-active='true']"
    ) as HTMLElement;
    if (!activeBtn) return;
    const containerRect = navRef.current.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    indicatorRef.current.style.width = `${btnRect.width}px`;
    indicatorRef.current.style.transform = `translateX(${btnRect.left - containerRect.left}px)`;
  }, []);

  useEffect(() => {
    moveIndicator();
    window.addEventListener("resize", moveIndicator);
    return () => window.removeEventListener("resize", moveIndicator);
  }, [moveIndicator, pathname]);

  return (
    <nav className="no-print fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-[rgba(91,122,84,0.18)] bg-background/95 px-4 py-4 shadow-[0_1px_18px_rgba(51,72,45,0.08)] backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-2.5 font-display text-2xl font-bold text-sage drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]">
        <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
          <circle cx="16" cy="16" r="14" fill="var(--sage-pale)" />
          <path
            d="M16 6c0 0-6 4-6 10s6 10 6 10 6-4 6-10-6-10-6-10z"
            fill="var(--sage)"
            opacity="0.8"
          />
          <path
            d="M16 10c0 0-3 3-3 6s3 6 3 6 3-3 3-6-3-6-3-6z"
            fill="var(--sage-light)"
          />
          <circle cx="16" cy="16" r="2" fill="#fff" />
        </svg>
        Bloom
      </div>

      <div
        ref={navRef}
        className="relative hidden items-center gap-1 rounded-[var(--radius-pill)] border border-[rgba(91,122,84,0.2)] bg-cream/95 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_6px_22px_rgba(62,82,56,0.08)] md:flex"
      >
        <span
          ref={indicatorRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-1 z-0 h-[calc(100%-8px)] rounded-[var(--radius-pill)] bg-white shadow-[0_3px_14px_rgba(64,92,58,0.22)] ring-1 ring-[rgba(91,122,84,0.08)] transition-all duration-350 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
        />
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <button
              key={item.href}
              data-active={isActive}
              onClick={() => router.push(item.href)}
              className={cn(
                "relative z-10 flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] border-none bg-transparent px-5 py-2.5 text-sm font-semibold transition-colors duration-300",
                isActive
                  ? "text-sage"
                  : "text-[var(--text-secondary)] hover:text-sage"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[rgba(91,122,84,0.24)] bg-white/80 text-[var(--text-secondary)] shadow-sm transition-all duration-300 hover:rotate-12 hover:bg-sage-pale hover:text-sage dark:bg-[var(--bg-secondary)]"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        )}
        <div className="h-10 w-10 cursor-pointer rounded-full border-2 border-sage p-0.5 shadow-sm transition-transform duration-500 hover:scale-110">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-sage-pale">
            <span className="text-sage text-sm font-semibold">M</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
