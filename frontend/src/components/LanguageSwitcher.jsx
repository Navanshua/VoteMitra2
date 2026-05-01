import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en',  label: 'EN',   name: 'English' },
  { code: 'hi',  label: 'हिं',  name: 'Hindi' },
  { code: 'ta',  label: 'தமி', name: 'Tamil' },
  { code: 'te',  label: 'తెలు', name: 'Telugu' },
  { code: 'bn',  label: 'বাং',  name: 'Bengali' },
  { code: 'mr',  label: 'मरा', name: 'Marathi' },
  { code: 'gu',  label: 'ગુજ',  name: 'Gujarati' },
  { code: 'kn',  label: 'ಕನ್ನ', name: 'Kannada' },
];

export default function LanguageSwitcher({ current, onChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Globe size={14} className="text-textMuted flex-shrink-0" />
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          id={`lang-btn-${lang.code}`}
          onClick={() => onChange(lang.code)}
          title={lang.name}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
            current === lang.code
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-textMuted hover:border-primary hover:text-primary'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
