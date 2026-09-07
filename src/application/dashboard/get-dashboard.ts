import { buildDashboardData } from "./rules";
import type { DashboardReader } from "./types";

export async function getDashboard(
  reader: DashboardReader,
  userId: string,
  now = new Date(),
) {
  return buildDashboardData(await reader.read(userId), now);
}
