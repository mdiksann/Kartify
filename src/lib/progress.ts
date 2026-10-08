export function progressPercent(done: number, total: number): number {
  return total <= 0
    ? 0
    : Math.round((Math.max(0, Math.min(done, total)) / total) * 100);
}
