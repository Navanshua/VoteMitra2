/**
 * useTranslate — A React hook for on-the-fly translation via
 * the backend Google Cloud Translation API.
 *
 * Usage:
 *   const t = useTranslate(language);
 *   const heading = t('Election News');  // returns translated string (or original while loading)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { translateTexts } from '../gcp/translate';

// ── Module-level shared state ──────────────────────────────────────
// Shared across ALL components using this hook — prevents request flooding.

const cache = {};                         // lang::text → translatedText
let globalQueue = new Set();              // texts waiting to be translated
let globalLang = 'en';                    // current target language
let flushTimer = null;                    // debounce timer
let flushInProgress = false;              // lock to prevent parallel flushes
const subscribers = new Set();            // forceUpdate callbacks from each hook instance

function cacheKey(text, lang) {
  return `${lang}::${text}`;
}

/** Notify all mounted hook instances to re-render */
function notifyAll() {
  subscribers.forEach((fn) => fn());
}

/** Flush the global queue — batch all pending texts into one API call */
async function flushQueue() {
  if (flushInProgress || globalQueue.size === 0 || globalLang === 'en') return;

  flushInProgress = true;
  const texts = [...globalQueue];
  globalQueue.clear();

  // Only translate texts not already cached
  const uncached = texts.filter((t) => !cache[cacheKey(t, globalLang)]);

  if (uncached.length === 0) {
    flushInProgress = false;
    return;
  }

  try {
    const results = await translateTexts(uncached, globalLang);
    uncached.forEach((text, i) => {
      cache[cacheKey(text, globalLang)] = results[i] || text;
    });
    notifyAll(); // tell all components to re-render with translated text
  } catch (err) {
    console.warn('Translation batch failed:', err.message);
    // Cache originals so we don't keep retrying failed texts
    uncached.forEach((text) => {
      cache[cacheKey(text, globalLang)] = text;
    });
  } finally {
    flushInProgress = false;
    // If more texts were queued during the flush, flush again
    if (globalQueue.size > 0) {
      flushTimer = setTimeout(flushQueue, 150);
    }
  }
}

/** Schedule a debounced flush */
function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushQueue, 200); // 200ms debounce — collects all t() calls
}

// ── Hook ───────────────────────────────────────────────────────────

export default function useTranslate(language) {
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((n) => n + 1), []);

  // Register/unregister this instance as a subscriber
  useEffect(() => {
    subscribers.add(forceUpdate);
    return () => subscribers.delete(forceUpdate);
  }, [forceUpdate]);

  // Update the global target language
  useEffect(() => {
    if (language && language !== globalLang) {
      globalLang = language;
      notifyAll(); // re-render to pick up cached translations for new language
    }
  }, [language]);

  /**
   * Translate a single string.
   * Returns immediately with cached value or the original (queues API call if needed).
   */
  const t = useCallback(
    (text) => {
      if (!text || language === 'en') return text;

      const key = cacheKey(text, language);
      if (cache[key]) return cache[key];

      // Queue for batch translation
      globalQueue.add(text);
      scheduleFlush();

      return text; // return original while translation is pending
    },
    [language]
  );

  return t;
}
