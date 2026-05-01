import { useState, useEffect, useCallback } from 'react';
import { fetchCandidates } from '../utils/candidates';
import { getPartyColor } from '../utils/partyColors';
import { Search, AlertTriangle, BookOpen, Wallet, Scale } from 'lucide-react';
import useTranslate from '../hooks/useTranslate';

function CandidateSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="skeleton h-5 w-3/4 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-5/6 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function CandidateCard({ acName, state, language }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const t = useTranslate(language);

  const load = useCallback(async () => {
    if (!acName) return;
    setLoading(true); setError('');
    try {
      const data = await fetchCandidates(acName, state);
      setCandidates(data.candidates || []);
    } catch (e) {
      setError(e.message || 'Could not load candidates');
    } finally {
      setLoading(false);
    }
  }, [acName, state]);

  useEffect(() => { load(); }, [load]);

  const filtered = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.party.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section id="candidates-section" className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-heading text-xl font-bold text-textPrimary">
          🏛️ {t('Candidates')} — {acName}
        </h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            id="candidate-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search name or party…')}
            className="input-base pl-8 pr-3 py-2 text-sm w-56"
          />
        </div>
      </div>

      {loading && <CandidateSkeleton />}

      {!loading && error && (
        <div className="card p-4 flex items-center gap-3 text-sm">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <span className="text-red-400">{t(error)}</span>
          <button onClick={load} className="ml-auto text-primary hover:underline text-xs">
            {t('Retry')} →
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card p-6 text-center text-textMuted text-sm">
          {search
            ? `${t('No candidates matching')} "${search}"`
            : `${t('No candidate data found for')} ${acName} (2024).`}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => {
            const partyColor = getPartyColor(c.party);
            return (
              <div
                key={i}
                className="card p-4 flex flex-col gap-2.5 hover:shadow-lg transition-shadow relative overflow-hidden"
                style={{ borderLeftColor: partyColor, borderLeftWidth: 3 }}
              >
                {c.winner && (
                  <span className="absolute top-3 right-3 badge badge-green text-xs">🏆 {t('Winner')}</span>
                )}
                <div>
                  <h3 className="font-heading font-bold text-base text-textPrimary">{c.name}</h3>
                  <span
                    className="badge text-xs mt-1"
                    style={{ background: `${partyColor}22`, color: partyColor }}
                  >
                    {c.party}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-textMuted">
                  <div className="flex items-center gap-2">
                    <BookOpen size={13} className="text-secondary flex-shrink-0" />
                    <span>{t(c.education || 'Not Disclosed')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet size={13} className="text-secondary flex-shrink-0" />
                    <span>{t('Assets')}: <span className="text-textPrimary">{c.assets}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Scale size={13} className="text-secondary flex-shrink-0" />
                    {c.criminal_cases === 0 ? (
                      <span className="badge badge-green">{t('Clean Record')} ✓</span>
                    ) : (
                      <span className="badge badge-red">{c.criminal_cases} {t('Cases Pending')}</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-textMuted/60 mt-auto pt-1 border-t border-border">
                  {t('Source')}: ECI Affidavit · Lok Dhaba
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
