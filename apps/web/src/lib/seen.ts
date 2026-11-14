// Which alerts this browser has already shown (a per-browser convenience only).
const key = (id: string) => `unclaimed.seen.${id}`;

export function seenAlerts(id: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key(id)) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function markAlertsSeen(id: string, keys: string[]) {
  try {
    localStorage.setItem(key(id), JSON.stringify(keys));
  } catch {}
}
