export function slugFromLabel(label: string): string {
  const slug = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);

  return slug.length ? slug : "STATUS";
}

export function uniqueSlug(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;

  for (let index = 2; index < 1000; index += 1) {
    const suffix = `_${index}`;
    const candidate = `${base.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${base.slice(0, 50)}_${Date.now()}`.slice(0, 64);
}

export function applyStatusOrder<T extends { id: string; sortOrder: number }>(
  statuses: readonly T[],
  orderedIds: readonly string[],
): T[] {
  const byId = new Map(statuses.map((status) => [status.id, status]));
  const seen = new Set<string>();
  const next: T[] = [];

  for (const id of orderedIds) {
    const status = byId.get(id);
    if (!status || seen.has(id)) continue;
    seen.add(id);
    next.push(status);
  }

  for (const status of statuses) {
    if (seen.has(status.id)) continue;
    next.push(status);
  }

  return next.map((status, index) => ({
    ...status,
    sortOrder: (index + 1) * 10,
  }));
}
