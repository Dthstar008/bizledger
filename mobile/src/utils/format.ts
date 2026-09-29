export function greetingFor(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name?: string | null): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return new Date(iso).toLocaleDateString('en-NG', opts);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}`;
}

/** "just now", "5 min ago", "3 h ago", "Yesterday", then a date. */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  if (h < 48) return 'Yesterday';
  return formatDate(iso, { day: 'numeric', month: 'short' });
}

/** Local calendar day key, for grouping lists by day. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function dayHeading(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (that === today) return 'Today';
  if (today - that === 86400000) return 'Yesterday';
  return formatDate(iso, { weekday: 'short', day: 'numeric', month: 'short' });
}

export const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
