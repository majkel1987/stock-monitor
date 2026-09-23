import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export function SettingsTabs({ active }: { active: "statuses" | "data" }) {
  const tabs = [
    { id: "statuses" as const, href: "/settings/statuses", label: "Statusy" },
    { id: "data" as const, href: "/settings/data", label: "Dane" },
  ];

  return (
    <nav
      aria-label="Sekcje ustawień"
      className="flex w-full max-w-md gap-1 rounded-[var(--radius-md)] border border-border bg-muted/80 p-1"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-9 flex-1 items-center justify-center rounded-[var(--radius-sm)] px-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary font-semibold text-primary-foreground shadow-[var(--shadow-sm)]"
                : "text-muted-foreground hover:bg-card hover:text-foreground",
            )}
            href={tab.href}
            key={tab.id}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
