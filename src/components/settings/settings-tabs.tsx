import Link from "next/link";

export function SettingsTabs({ active }: { active: "statuses" | "data" }) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex h-9 gap-5 border-b border-[var(--border-default)]"
    >
      <Link
        aria-current={active === "statuses" ? "page" : undefined}
        className={`flex h-9 items-center border-b-2 text-[11px] ${active === "statuses" ? "border-[var(--accent-primary)] font-semibold text-[var(--text-primary)]" : "border-transparent text-[var(--text-muted)]"}`}
        href="/settings/statuses"
      >
        Statuses
      </Link>
      <Link
        aria-current={active === "data" ? "page" : undefined}
        className={`flex h-9 items-center border-b-2 text-[11px] ${active === "data" ? "border-[var(--accent-primary)] font-semibold text-[var(--text-primary)]" : "border-transparent text-[var(--text-muted)]"}`}
        href="/settings/data"
      >
        Data
      </Link>
    </nav>
  );
}
