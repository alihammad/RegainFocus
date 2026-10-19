/** Wait before retry number `attempts` (1-based): 2s, 4s, 8s ... capped at 5 minutes. */
export function backoffMs(attempts: number): number {
  return Math.min(2000 * 2 ** Math.max(0, attempts - 1), 5 * 60 * 1000);
}
