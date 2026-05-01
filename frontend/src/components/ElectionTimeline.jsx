import { useRef, useEffect, useState, useCallback } from 'react';
import useTranslate from '../hooks/useTranslate';

/**
 * ElectionTimeline
 * Fetches real-time election schedule for the user's state from the backend.
 * Backend always responds instantly (fallback or cache) and runs Gemini in
 * a BackgroundTask. When fetching=true the frontend polls every 8s until
 * real dates appear from Gemini.
 */

const BACKEND   = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const POLL_MS   = 8000;
const MAX_POLLS = 10;
const SKELETON_COUNT = 6;

export default function ElectionTimeline({ language, state = 'West Bengal' }) {
  const t = useTranslate(language);
  const stripRef  = useRef(null);
  const activeRef = useRef(null);
  const pollRef   = useRef(null);
  const pollCount = useRef(0);

  const [events,     setEvents]     = useState([]);
  const [activeIdx,  setActiveIdx]  = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error,      setError]      = useState(null);
  const [cachedAt,   setCachedAt]   = useState(null);
  const [isStale,    setIsStale]    = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchTimeline = useCallback(async (forceRefresh = false, isPoll = false) => {
    if (!isPoll) { setLoading(true); setError(null); stopPolling(); pollCount.current = 0; }

    try {
      if (forceRefresh && !isPoll) {
        await fetch(
          `${BACKEND}/api/election/timeline/invalidate?state=${encodeURIComponent(state)}`,
          { method: 'POST' }
        );
      }

      const res = await fetch(
        `${BACKEND}/api/election/timeline?state=${encodeURIComponent(state)}`
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      setEvents(data.events || []);
      setActiveIdx(data.active_index ?? 0);
      setCachedAt(data.cached_at || null);
      setIsStale(!!data.stale);

      const stillFetching = !!data.fetching;
      setIsFetching(stillFetching);

      if (stillFetching && pollCount.current < MAX_POLLS) {
        pollCount.current += 1;
        pollRef.current = setTimeout(() => fetchTimeline(false, true), POLL_MS);
      }
    } catch (err) {
      setError(err.message || 'Failed to load timeline');
      setIsFetching(false);
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, [state, stopPolling]);

  useEffect(() => {
    fetchTimeline();
    
    // Auto-refresh the timeline every 10 minutes
    const intervalId = setInterval(() => {
      fetchTimeline();
    }, 10 * 60 * 1000); // 10 minutes in milliseconds

    return () => {
      stopPolling();
      clearInterval(intervalId);
    };
  }, [fetchTimeline, stopPolling]);

  useEffect(() => {
    if (!loading && events.length && activeRef.current && stripRef.current) {
      const strip = stripRef.current;
      const el    = activeRef.current;
      strip.scrollLeft = el.offsetLeft - strip.offsetWidth / 2 + el.offsetWidth / 2;
    }
  }, [loading, activeIdx, events.length]);

  // ── Render helpers ───────────────────────────────────────────────
  const renderSkeleton = () => (
    <div style={styles.stripOuter}>
      <div style={styles.fadeLeft} />
      <div style={styles.fadeRight} />
      <div style={styles.strip}>
        <div style={styles.connectorLine} />
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} style={styles.eventWrapper}>
            <div style={{ ...styles.card, ...(i % 2 === 0 ? styles.cardTop : styles.cardBottom), ...styles.skeletonCard }}>
              <div style={{ ...styles.skeletonBar, width: '40%', height: '10px', marginBottom: '8px', borderRadius: '99px' }} />
              <div style={{ ...styles.skeletonBar, width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 6px' }} />
              <div style={{ ...styles.skeletonBar, width: '80%', height: '10px', marginBottom: '4px' }} />
              <div style={{ ...styles.skeletonBar, width: '60%', height: '8px' }} />
            </div>
            <div style={i % 2 === 0 ? styles.armDown : styles.armUp} />
            <div style={{ ...styles.node, background: '#1a2f4a', borderColor: '#2a3f5a' }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section id="election-timeline" style={styles.wrapper}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={styles.headerRow}>
        <div style={styles.titleGroup}>
          <span style={styles.titleIcon}>🗓️</span>
          <div>
            <h2 style={styles.title}>{t('Election Timeline')}</h2>
            <p style={styles.subtitle}>
              {t('Real-time schedule for')} {state} &nbsp;·&nbsp;
              {loading
                ? <span style={{ color: '#8892B0' }}>{t('Fetching latest data...')}</span>
                : isFetching
                  ? <span style={{ color: '#FFD93D' }}>⏳ {t('AI is fetching live dates...')}</span>
                  : cachedAt
                    ? <span style={{ color: '#8892B0', fontSize: '0.68rem' }}>
                        {t('Updated')} {new Date(cachedAt).toLocaleString()}
                        {isStale && <span style={styles.staleTag}> · {t('stale')}</span>}
                      </span>
                    : null
              }
            </p>
          </div>
        </div>

        <div style={styles.rightGroup}>
          {!loading && (
            <button
              id="timeline-refresh-btn"
              title={t('Force refresh from Gemini AI')}
              style={styles.refreshBtn}
              onClick={() => fetchTimeline(true)}
            >
              ↻ {t('Refresh')}
            </button>
          )}
          <div style={styles.liveChip}>
            <span style={loading || isFetching ? styles.loadingDot : styles.liveDot} />
            {loading ? t('Loading…') : isFetching ? t('Updating…') : t('AI-Powered')}
          </div>
        </div>
      </div>

      {/* ── Phase legend ────────────────────────────────────────── */}
      <div style={styles.legend}>
        {['Pre-Election', 'Campaign', 'Voting', 'Post-Election'].map((phase) => (
          <span key={phase} style={{ ...styles.legendItem, color: phaseColor(phase) }}>
            <span style={{ ...styles.legendDot, background: phaseColor(phase) }} />
            {t(phase)}
          </span>
        ))}
      </div>

      {/* ── Error banner ────────────────────────────────────────── */}
      {error && !loading && (
        <div style={styles.errorBanner}>
          ⚠️ {t('Could not fetch latest timeline')}: {error}.&nbsp;
          <button style={styles.retryLink} onClick={() => fetchTimeline()}>
            {t('Retry')}
          </button>
        </div>
      )}

      {/* ── Strip: show skeleton only on first load, else always show cards ── */}
      {(loading && events.length === 0) ? renderSkeleton() : (
        <div style={styles.stripOuter}>
          <div style={styles.fadeLeft} />
          <div style={styles.fadeRight} />
          <div ref={stripRef} style={styles.strip} className="election-timeline-strip">
            <div style={styles.connectorLine} />

            {events.map((event, idx) => {
              const isActive  = idx === activeIdx;
              const isPast    = idx < activeIdx;
              const isHovered = idx === hoveredIdx;
              const color     = event.color || '#8892B0';

              return (
                <div
                  key={event.id || idx}
                  ref={isActive ? activeRef : null}
                  style={styles.eventWrapper}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  {/* Card — alternates above / below the line */}
                  <div
                    style={{
                      ...styles.card,
                      ...(idx % 2 === 0 ? styles.cardTop : styles.cardBottom),
                      ...(isActive  ? { border: `1px solid ${color}66`, background: `linear-gradient(135deg, rgba(17,34,64,0.98) 0%, ${color}11 100%)`, boxShadow: `0 4px 24px ${color}33` } : {}),
                      ...(isPast    ? { opacity: 0.55 } : {}),
                      ...(isHovered ? { transform: 'translateY(-4px)', border: `1px solid ${color}88`, boxShadow: `0 8px 32px ${color}44`, zIndex: 10 } : {}),
                    }}
                  >
                    {/* Phase badge */}
                    <span style={{
                      ...styles.phaseBadge,
                      color: phaseColor(event.phase),
                      borderColor: phaseColor(event.phase) + '44',
                      background:  phaseColor(event.phase) + '18',
                    }}>
                      {t(event.phase)}
                    </span>

                    <div style={styles.cardIcon}>{event.icon}</div>
                    <div style={{ ...styles.cardLabel, color: isActive ? color : '#E8F4FD' }}>
                      {t(event.label)}
                    </div>
                    <div style={{ ...styles.cardDate, color }}>
                      {event.date}
                    </div>

                    {/* Hover tooltip */}
                    {isHovered && event.description && (
                      <div style={{
                        ...styles.tooltip,
                        bottom: idx % 2 === 0 ? 'calc(100% + 8px)' : 'auto',
                        top:    idx % 2 !== 0 ? 'calc(100% + 8px)' : 'auto',
                      }}>
                        <p style={styles.tooltipText}>{t(event.description)}</p>
                      </div>
                    )}
                  </div>

                  {/* Connector arm */}
                  <div style={idx % 2 === 0 ? styles.armDown : styles.armUp} />

                  {/* Node */}
                  <div style={{
                    ...styles.node,
                    background:   isActive || isPast ? color : '#1a2f4a',
                    borderColor:  color,
                    boxShadow:    isActive ? `0 0 0 6px ${color}33, 0 0 20px ${color}55` : 'none',
                  }}>
                    {isActive && <div style={{ ...styles.nodePulse, background: color }} />}
                    {isPast   && <span style={styles.nodeCheck}>✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <p style={styles.scrollHint}>
        ← {t('Scroll to see all dates')} → &nbsp;·&nbsp;
        <span style={{ opacity: 0.5 }}>{t('Powered by Gemini AI + ECI data')}</span>
      </p>
    </section>
  );
}

function phaseColor(phase) {
  return {
    'Pre-Election': '#4ECDC4',
    'Campaign':     '#FF6B9D',
    'Voting':       '#FF6B35',
    'Post-Election':'#4CD964',
  }[phase] || '#8892B0';
}

/* ── Styles ─────────────────────────────────────────────────────── */
const styles = {
  wrapper: {
    background: 'linear-gradient(135deg, #112240 0%, #0d1e35 60%, #0a1628 100%)',
    border:     '1px solid rgba(255,107,53,0.2)',
    borderRadius: '16px',
    padding:    '24px 0 16px',
    overflow:   'hidden',
    position:   'relative',
  },
  headerRow: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '0 28px 16px', flexWrap: 'wrap', gap: '12px',
  },
  titleGroup: { display: 'flex', alignItems: 'flex-start', gap: '12px' },
  titleIcon:  { fontSize: '1.6rem', lineHeight: 1 },
  title: {
    fontSize: '1.25rem', fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 700, color: '#E8F4FD', letterSpacing: '0.04em', margin: 0,
  },
  subtitle: { fontSize: '0.73rem', color: '#8892B0', margin: '2px 0 0' },
  rightGroup: { display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 },
  refreshBtn: {
    background: 'rgba(78,205,196,0.1)', border: '1px solid rgba(78,205,196,0.3)',
    borderRadius: '8px', color: '#4ECDC4', fontSize: '0.72rem', fontWeight: 600,
    padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.04em',
    transition: 'background 0.2s',
  },
  liveChip: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)',
    borderRadius: '99px', padding: '4px 12px',
    fontSize: '0.72rem', fontWeight: 600, color: '#FF6B35',
    letterSpacing: '0.06em', textTransform: 'uppercase',
  },
  liveDot: {
    width: '6px', height: '6px', borderRadius: '50%', background: '#FF6B35',
    animation: 'livePulse 1.5s ease-in-out infinite',
  },
  loadingDot: {
    width: '6px', height: '6px', borderRadius: '50%', background: '#8892B0',
    animation: 'livePulse 1s ease-in-out infinite',
  },
  staleTag: { color: '#FFD93D', fontStyle: 'italic' },
  errorBanner: {
    margin: '0 28px 12px', padding: '10px 14px',
    background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)',
    borderRadius: '8px', fontSize: '0.78rem', color: '#FF9090',
  },
  retryLink: {
    background: 'none', border: 'none', color: '#4ECDC4',
    cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', fontSize: 'inherit',
  },
  legend: {
    display: 'flex', gap: '16px', flexWrap: 'wrap',
    padding: '0 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  legendItem: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em',
  },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  stripOuter: { position: 'relative' },
  fadeLeft: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: '40px',
    background: 'linear-gradient(to right, #0d1e35, transparent)', zIndex: 2, pointerEvents: 'none',
  },
  fadeRight: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: '40px',
    background: 'linear-gradient(to left, #0d1e35, transparent)', zIndex: 2, pointerEvents: 'none',
  },
  strip: {
    display: 'flex', alignItems: 'center',
    overflowX: 'auto', padding: '120px 40px',
    scrollSnapType: 'x mandatory', scrollBehavior: 'smooth',
    position: 'relative', cursor: 'grab',
    msOverflowStyle: 'none', scrollbarWidth: 'none',
  },
  connectorLine: {
    position: 'absolute', top: '50%', left: '40px', right: '40px', height: '2px',
    background: 'linear-gradient(to right, rgba(78,205,196,0.3), rgba(255,107,53,0.5), rgba(76,217,100,0.3))',
    transform: 'translateY(-50%)', zIndex: 0,
  },
  eventWrapper: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    position: 'relative', zIndex: 1, flexShrink: 0, width: '170px', scrollSnapAlign: 'center',
  },
  card: {
    background: 'rgba(17,34,64,0.95)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '12px 14px', width: '160px', textAlign: 'center',
    transition: 'all 0.3s ease', position: 'relative', cursor: 'default',
    backdropFilter: 'blur(8px)',
  },
  cardTop:    { marginBottom: '8px', order: 1 },
  cardBottom: { marginTop: '8px',    order: 3 },
  skeletonCard: { minHeight: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  skeletonBar: {
    background: 'rgba(136,146,176,0.15)', borderRadius: '4px',
    animation: 'skeleton-pulse 1.4s ease-in-out infinite',
  },
  phaseBadge: {
    display: 'inline-block', fontSize: '0.6rem', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    border: '1px solid', borderRadius: '99px', padding: '1px 7px', marginBottom: '6px',
  },
  cardIcon:  { fontSize: '1.4rem', marginBottom: '4px' },
  cardLabel: {
    fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
    fontSize: '0.82rem', lineHeight: 1.2, marginBottom: '4px', letterSpacing: '0.02em',
  },
  cardDate: { fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.04em' },
  tooltip: {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    width: '180px', background: '#0a1628',
    border: '1px solid rgba(255,107,53,0.3)', borderRadius: '8px',
    padding: '8px 10px', zIndex: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    pointerEvents: 'none', animation: 'fadeInUp 0.2s ease forwards',
  },
  tooltipText: { fontSize: '0.7rem', color: '#8892B0', lineHeight: 1.5, margin: 0 },
  armDown: { width: '2px', height: '24px', background: 'rgba(255,255,255,0.15)', order: 2, flexShrink: 0 },
  armUp:   { width: '2px', height: '24px', background: 'rgba(255,255,255,0.15)', order: 2, flexShrink: 0 },
  node: {
    width: '18px', height: '18px', borderRadius: '50%', border: '2px solid',
    flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center',
    justifyContent: 'center', transition: 'all 0.3s ease', order: 2,
  },
  nodePulse: {
    position: 'absolute', inset: '-5px', borderRadius: '50%',
    opacity: 0.3, animation: 'livePulse 2s ease-in-out infinite',
  },
  nodeCheck: { fontSize: '0.55rem', color: '#0a1628', fontWeight: 900 },
  scrollHint: {
    textAlign: 'center', fontSize: '0.7rem', color: 'rgba(136,146,176,0.5)',
    padding: '8px 0 4px', letterSpacing: '0.06em',
  },
};
