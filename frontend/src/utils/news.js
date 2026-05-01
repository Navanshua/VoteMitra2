/**
 * News API utilities.
 */
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function fetchNews(district, state = '') {
  const url = new URL(`${BACKEND}/api/news/${encodeURIComponent(district)}`);
  if (state) url.searchParams.set('state', state);
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error('Failed to fetch news');
  return resp.json();
}

/**
 * Format a date string as "X hours/days ago"
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return dateStr;
  }
}
