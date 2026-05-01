import { useState } from 'react';
import { MapPin, ExternalLink, AlertTriangle, Navigation } from 'lucide-react';
import useTranslate from '../hooks/useTranslate';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function BoothNavigator({ language }) {
  const [epicId, setEpicId]   = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const t = useTranslate(language);

  async function handleSearch(e) {
    e.preventDefault();
    const id = epicId.trim().toUpperCase();
    if (!id) return;

    setLoading(true); setError(''); setResult(null);
    try {
      const resp = await fetch(`${BACKEND}/api/booth/${encodeURIComponent(id)}`);
      const data = await resp.json();
      setResult(data);
    } catch {
      setError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const mapsUrl = result?.booth?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.booth.address)}`
    : null;

  return (
    <section id="booth-section" className="space-y-4">
      <h2 className="font-heading text-xl font-bold text-textPrimary">🗳️ {t('Find Your Polling Booth')}</h2>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          id="epic-id-input"
          type="text"
          value={epicId}
          onChange={(e) => setEpicId(e.target.value)}
          placeholder={t('Enter your EPIC Voter ID (e.g. ABC1234567)')}
          className="input-base flex-1 px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          id="booth-search-btn"
          disabled={loading || !epicId.trim()}
          className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Navigation size={15} />
          {loading ? t('Searching…') : t('Find Booth')}
        </button>
      </form>

      {error && (
        <div className="card p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm">{t(error)}</span>
        </div>
      )}

      {result && (
        <div className="card p-4 space-y-4 fade-in-up">
          {result.booth ? (
            <>
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-heading font-bold text-lg text-textPrimary">
                    {t('Booth')} #{result.booth.number} — {result.booth.name}
                  </h3>
                  <p className="text-sm text-textMuted mt-1">{t(result.booth.address)}</p>
                </div>
              </div>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="maps-link"
                  className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-sm"
                >
                  🗺️ {t('Open in Google Maps')} <ExternalLink size={14} />
                </a>
              )}
            </>
          ) : (
            /* ECI redirect fallback */
            <div className="text-center space-y-3 py-2">
              <MapPin size={32} className="text-primary mx-auto" />
              <p className="text-sm text-textMuted">{t(result.message)}</p>
              <a
                href={result.eci_url}
                target="_blank"
                rel="noopener noreferrer"
                id="eci-booth-link"
                className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm"
              >
                {t('Search on ECI Portal')} <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-textMuted">
        {t('Your EPIC voter ID is printed on your voter card. Format: 3 letters + 7 digits.')}
      </p>
    </section>
  );
}
