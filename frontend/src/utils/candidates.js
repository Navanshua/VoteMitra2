/**
 * Candidates API utilities.
 */
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function fetchCandidates(acName, state = '') {
  const url = new URL(`${BACKEND}/api/candidates/${encodeURIComponent(acName)}`);
  if (state) url.searchParams.set('state', state);
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error('Failed to fetch candidates');
  return resp.json();
}
