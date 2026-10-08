// ponytail: per-process limits reset on restart; use a shared store for multiple app instances.
export function createRateLimiter(limit = 10, windowMs = 60_000) {
  const entries = new Map<string, { count: number; expires: number }>();
  return (key: string, now = Date.now()): boolean => {
    for (const [ip, entry] of entries)
      if (entry.expires <= now) entries.delete(ip);
    const entry = entries.get(key) ?? { count: 0, expires: now + windowMs };
    if (!entries.has(key) && entries.size >= 10_000) return false;
    entry.count++;
    entries.set(key, entry);
    return entry.count <= limit;
  };
}
export const allowAuthAttempt = createRateLimiter();
