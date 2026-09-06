import type { WatchlistWriter } from "./types";

export type ArchiveChangeResult = { status: "updated" | "not_found" };

export async function archiveWatchlistItem(
  writer: WatchlistWriter,
  userId: string,
  watchlistItemId: string,
): Promise<ArchiveChangeResult> {
  return {
    status: (await writer.archive(userId, watchlistItemId))
      ? "updated"
      : "not_found",
  };
}

export async function restoreWatchlistItem(
  writer: WatchlistWriter,
  userId: string,
  watchlistItemId: string,
): Promise<ArchiveChangeResult> {
  return {
    status: (await writer.restore(userId, watchlistItemId))
      ? "updated"
      : "not_found",
  };
}
