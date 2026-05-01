import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, CheckSquare, Square } from 'lucide-react';
import useTranslate from '../hooks/useTranslate';

const FORMS = [
  {
    id: 'form6',
    trigger: 'New voter registration',
    form: 'Form 6',
    purpose: 'Register as a first-time voter in your constituency.',
    documents: [
      'Proof of Age (Aadhaar / Birth Certificate / Class 10 Marksheet)',
      'Proof of Residence (Aadhaar / Utility Bill / Rent Agreement)',
      'Recent passport-size photograph',
      'Self-declaration of citizenship',
    ],
    deadline: '90 days before election date',
    url: 'https://voters.eci.gov.in/signup/form6',
  },
  {
    id: 'form8',
    trigger: 'Changed address',
    form: 'Form 8',
    purpose: 'Update your address details in the electoral roll.',
    documents: [
      'Existing EPIC voter ID card',
      'Proof of new residence (Aadhaar / Utility Bill)',
      'Recent passport-size photograph',
    ],
    deadline: '60 days before election date',
    url: 'https://voters.eci.gov.in/signup/form8',
  },
  {
    id: 'form8a',
    trigger: 'Correct my details',
    form: 'Form 8A',
    purpose: 'Correct errors in name, age, photo, or other details on your voter card.',
    documents: [
      'Existing EPIC voter ID card',
      'Document proving the correct information (Aadhaar / PAN / Passport)',
      'Recent passport-size photograph',
    ],
    deadline: '60 days before election date',
    url: 'https://voters.eci.gov.in/signup/form8a',
  },
];

function DocChecklist({ docs, t }) {
  const [checked, setChecked] = useState({});
  const toggle = (i) => setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  return (
    <ul className="space-y-2 mt-2">
      {docs.map((doc, i) => (
        <li
          key={i}
          onClick={() => toggle(i)}
          className="flex items-start gap-2.5 cursor-pointer group"
        >
          <span className={`mt-0.5 flex-shrink-0 transition-colors ${checked[i] ? 'text-green-400' : 'text-textMuted'}`}>
            {checked[i] ? <CheckSquare size={16} /> : <Square size={16} />}
          </span>
          <span
            className={`text-sm transition-colors ${
              checked[i] ? 'text-textMuted line-through' : 'text-textPrimary'
            }`}
          >
            {t(doc)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FormFlow({ form, t }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-primary/5 transition-colors"
        id={`form-accordion-${form.id}`}
      >
        <div className="flex items-center gap-3">
          <span className="badge badge-orange font-mono text-xs">{form.form}</span>
          <span className="font-medium text-textPrimary text-sm">{t(form.trigger)}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-textMuted" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border fade-in-up">
          <p className="text-sm text-textMuted pt-3">{t(form.purpose)}</p>

          <div>
            <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">
              {t('Documents Needed')}
            </h4>
            <DocChecklist docs={form.documents} t={t} />
          </div>

          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-primary">⏰ {t('Deadline')}:</span>
            <span className="text-xs text-textPrimary">{t(form.deadline)}</span>
          </div>

          <a
            href={form.url}
            target="_blank"
            rel="noopener noreferrer"
            id={`form-apply-${form.id}`}
            className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 text-sm w-full"
          >
            {t('Apply Now on ECI Portal')} <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
}

export default function FormsWizard({ language }) {
  const t = useTranslate(language);

  return (
    <section id="forms-section" className="space-y-4">
      <h2 className="font-heading text-xl font-bold text-textPrimary">📋 {t('Voter Registration Help')}</h2>
      <p className="text-sm text-textMuted">
        {t("Select what you need — we'll guide you through the right form and documents.")}
      </p>

      <div className="space-y-3">
        {FORMS.map((form) => (
          <FormFlow key={form.id} form={form} t={t} />
        ))}

        {/* Check voter list link */}
        <div className="card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="badge badge-teal text-xs">{t('SEARCH')}</span>
            <span className="text-sm text-textPrimary font-medium">{t('Check your name in voter list')}</span>
          </div>
          <a
            href="https://voters.eci.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            id="eci-portal-link"
            className="flex items-center gap-1 text-sm text-primary hover:underline flex-shrink-0"
          >
            {t('ECI Portal')} <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}
