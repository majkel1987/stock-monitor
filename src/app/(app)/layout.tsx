import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";

export default async function ApplicationLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireAllowedUser();
  return <AppShell>{children}</AppShell>;
}
