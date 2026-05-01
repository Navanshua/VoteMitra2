import { MapPin, Clock } from 'lucide-react';
import AuthButton from './AuthButton';
import LanguageSwitcher from './LanguageSwitcher';
import useTranslate from '../hooks/useTranslate';

export default function DashboardHeader({
  profile,
  user,
  language,
  onLanguageChange,
  onLogout,
  lastUpdated,
}) {
  const t = useTranslate(language);

  return (
    <header
      id="dashboard-header"
      className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: location info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1 text-primary flex-shrink-0">
            <MapPin size={16} />
            <span className="font-heading font-bold text-lg">VoterMitra</span>
          </div>
          {profile && (
            <div className="hidden sm:flex items-center gap-1 text-sm text-textMuted ml-2 truncate">
              <span className="text-primary">📍</span>
              <span className="truncate">
                {t(profile.district)} · {t(profile.ac_name)} · {t(profile.state)}
              </span>
            </div>
          )}
        </div>

        {/* Right: lang + auth */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <LanguageSwitcher current={language} onChange={onLanguageChange} />
          <AuthButton user={user} onLogout={onLogout} />
        </div>
      </div>

      {/* Sub-bar: last updated */}
      {lastUpdated && (
        <div className="max-w-7xl mx-auto px-4 pb-2 flex items-center gap-1 text-xs text-textMuted">
          <Clock size={11} />
          <span>{t('Last updated')}: {lastUpdated}</span>
        </div>
      )}
    </header>
  );
}
