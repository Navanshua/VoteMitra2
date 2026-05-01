/**
 * Google Cloud Translation API v2 — frontend helper.
 * Routes through our backend to keep API key server-side.
 */
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function translateTexts(texts, targetLang) {
  if (!texts || texts.length === 0) return texts;
  if (targetLang === 'en') return texts; // no-op

  const resp = await fetch(`${BACKEND}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, target_lang: targetLang }),
  });
  if (!resp.ok) throw new Error('Translation failed');
  const data = await resp.json();
  return data.translations || texts;
}
