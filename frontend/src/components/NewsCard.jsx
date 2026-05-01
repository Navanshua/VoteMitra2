import { useState, useEffect, useCallback } from 'react';
import { fetchNews, timeAgo } from '../utils/news';
import { RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import useTranslate from '../hooks/useTranslate';

const CATEGORIES = ['All', 'Rally', 'Deadline', 'Candidate', 'Result'];

const CATEGORY_COLORS = {
  rally:     'badge-orange',
  deadline:  'badge-red',
  candidate: 'badge-teal',
  result:    'badge-green',
};

function NewsSkeleton() {
  return (
    <div className="flex gap-4 scroll-strip py-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card w-72 flex-shrink-0 p-4 space-y-3">
          <div className="skeleton h-4 w-20 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-5/6 rounded" />
          <div className="skeleton h-3 w-4/6 rounded" />
          <div className="skeleton h-3 w-24 rounded mt-2" />
        </div>
      ))}
    </div>
  );
}

export default function NewsCard({ district, state, language }) {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState('All');
  const [lastFetch, setLastFetch] = useState(null);
  const t = useTranslate(language);

  const load = useCallback(async () => {
    if (!district) return;
    setLoading(true); setError('');
    try {
      const data = await fetchNews(district, state);
      setSummaries(data.summaries || []);
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message || 'Could not load news');
    } finally {
      setLoading(false);
    }
  }, [district, state]);

  useEffect(() => {
    load();
    // Auto-refresh every 30 minutes
    const timer = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);

  const filtered = summaries.filter(
    (s) => filter === 'All' || s.category?.toLowerCase() === filter.toLowerCase()
  );

  return (
    <section id="news-section" className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-textPrimary">
          📰 {t('Election News')} — {district}
        </h2>
        <button
          onClick={load}
          disabled={loading}
          id="news-refresh-btn"
          className="flex items-center gap-1 text-xs text-textMuted hover:text-primary transition-colors disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {lastFetch ? `${t('Updated')} ${timeAgo(lastFetch)}` : t('Refresh')}
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            id={`news-filter-${cat.toLowerCase()}`}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filter === cat
                ? 'bg-primary border-primary text-white'
                : 'border-border text-textMuted hover:border-primary hover:text-primary bg-surface'
            }`}
          >
            {t(cat)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <NewsSkeleton />}

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
          {t('No')} {filter !== 'All' ? t(filter.toLowerCase()) : ''} {t('news found for')} {district}.
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="scroll-strip pb-4">
          {filtered.map((item, i) => (
            <article
              key={i}
              className="card w-72 flex-shrink-0 p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className={`badge ${CATEGORY_COLORS[item.category] || 'badge-orange'}`}>
                  {t(item.category?.toUpperCase() || 'NEWS')}
                </span>
                <span className="text-xs text-textMuted">{timeAgo(item.published)}</span>
              </div>

              <p
                className="text-sm text-textPrimary leading-relaxed line-clamp-5"
                dangerouslySetInnerHTML={{
                  __html: t(item.summary || '')?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '',
                }}
              />

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                <span className="text-xs text-textMuted truncate max-w-[60%]">{item.source}</span>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                  >
                    {t('Read more')} <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
