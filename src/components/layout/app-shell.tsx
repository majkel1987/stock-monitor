import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/dashboard">
          <span aria-hidden="true" className="brand-mark">
            SM
          </span>
          <span>
            <strong>Stock Monitor</strong>
            <small>Investment Research Hub</small>
          </span>
        </Link>
        <p className="environment-label">Development foundation</p>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <nav aria-label="Primary navigation">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
