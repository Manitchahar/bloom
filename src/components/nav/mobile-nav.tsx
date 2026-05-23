"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Plus, BarChart3, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/improve", label: "Improve", icon: BarChart3 },
  { href: "/library", label: "Library", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="no-print fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[rgba(91,122,84,0.2)] bg-background/95 px-4 py-2 shadow-[0_-4px_18px_rgba(51,72,45,0.08)] backdrop-blur-xl md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border-none bg-transparent px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              isActive ? "bg-sage-pale text-sage" : "text-[var(--text-secondary)]"
            )}
          >
            <item.icon className={cn("w-5 h-5", isActive && "text-sage")} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
