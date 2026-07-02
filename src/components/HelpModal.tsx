import type { Lang } from '../i18n/translations';
import { translations } from '../i18n/translations';
import './HelpModal.css';

interface HelpModalProps {
  lang: Lang;
  onClose: () => void;
}

export default function HelpModal({ lang, onClose }: HelpModalProps) {
  const t = translations[lang].help;

  return (
    <div
      className="help-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="help-modal">
        <div className="help-modal-header">
          <h2>{t.title}</h2>
          <button
            type="button"
            className="help-modal-close"
            onClick={onClose}
            aria-label={t.close}
          >
            ✕
          </button>
        </div>

        <div className="help-modal-body">
          <section className="help-section">
            <h3>{t.navTitle}</h3>
            <dl className="help-nav-map">
              {t.navMap.map((row, i) => (
                <div className="help-nav-row" key={i}>
                  <dt>{row.tab}</dt>
                  <dd>{row.contains}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="help-section help-disclaimer">
            <h3>⚠️ {t.disclaimerTitle}</h3>
            <p>{t.disclaimerDesc}</p>
          </section>

          <section className="help-section">
            <h3>{t.dataTitle}</h3>
            <p>{t.dataDesc}</p>
          </section>

          <section className="help-section">
            <h3>{t.feedbackTitle}</h3>
            <p>{t.feedbackDesc}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
