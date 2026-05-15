import { useState } from 'react';
import type { Lang } from '../../i18n/translations';
import './FeedbackButton.css';

const ENDPOINT = 'https://formspree.io/f/xaqvgzpb';

const text = {
  en: {
    fab: 'Feedback',
    title: 'Share your feedback',
    ratingLabel: 'How useful was this tool?',
    featuresLabel: 'Which feature did you use?',
    suggestionsLabel: 'Any suggestions or missing features?',
    suggestionsPlaceholder: 'Tell us what you think…',
    emailLabel: 'Email (optional)',
    emailPlaceholder: 'you@example.com',
    submit: 'Submit Feedback',
    submitting: 'Submitting…',
    successTitle: 'Thank you!',
    successSub: 'Your feedback helps us improve EpiCalc.',
    features: ['Epi Metrics', 'Screening', 'SIR Model', 'Biostatistics'],
  },
  ko: {
    fab: '피드백',
    title: '의견을 들려주세요',
    ratingLabel: '이 도구가 얼마나 유용했나요?',
    featuresLabel: '어떤 기능을 사용하셨나요?',
    suggestionsLabel: '개선사항이나 추가 기능 제안',
    suggestionsPlaceholder: '의견을 자유롭게 작성해주세요…',
    emailLabel: '이메일 (선택)',
    emailPlaceholder: 'you@example.com',
    submit: '제출하기',
    submitting: '제출 중…',
    successTitle: '감사합니다!',
    successSub: '소중한 의견이 EpiCalc 개선에 도움이 됩니다.',
    features: ['역학 지표', '스크리닝', 'SIR 모델', '생물통계'],
  },
} as const;

const FEATURE_KEYS = ['Epi Metrics', 'Screening', 'SIR Model', 'Biostatistics'] as const;

interface Props {
  lang: Lang;
}

export default function FeedbackButton({ lang }: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const t = text[lang];

  const toggleFeature = (key: string) => {
    setFeatures(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleClose = () => {
    setOpen(false);
    // reset after close animation
    setTimeout(() => {
      setRating(0);
      setHoverRating(0);
      setFeatures(new Set());
      setSuggestions('');
      setEmail('');
      setSubmitted(false);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        rating,
        features: Array.from(features).join(', '),
        suggestions,
        email,
        lang,
      };
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <>
      <button className="feedback-fab" onClick={() => setOpen(true)} aria-label={t.fab}>
        <span className="feedback-fab-icon" aria-hidden="true">💬</span>
        <span className="feedback-fab-label">{t.fab}</span>
      </button>

      {open && (
        <div
          className="feedback-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="feedback-modal">
            <div className="feedback-header">
              <h2 className="feedback-title">{t.title}</h2>
              <button className="feedback-close" onClick={handleClose} aria-label="Close">✕</button>
            </div>

            {submitted ? (
              <div className="feedback-success">
                <span className="feedback-success-icon">🎉</span>
                <p className="feedback-success-title">{t.successTitle}</p>
                <p className="feedback-success-sub">{t.successSub}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
                {/* Star rating */}
                <div>
                  <span className="feedback-label">{t.ratingLabel}</span>
                  <div className="feedback-stars" role="group" aria-label={t.ratingLabel}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        className={`feedback-star${displayRating >= star ? ' active' : ''}`}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`${star} star`}
                        aria-pressed={rating === star}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feature checkboxes */}
                <div>
                  <span className="feedback-label">{t.featuresLabel}</span>
                  <div className="feedback-checkboxes">
                    {FEATURE_KEYS.map((key, i) => (
                      <label key={key} className="feedback-checkbox-item">
                        <input
                          type="checkbox"
                          checked={features.has(key)}
                          onChange={() => toggleFeature(key)}
                        />
                        {t.features[i]}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                <div>
                  <span className="feedback-label">{t.suggestionsLabel}</span>
                  <textarea
                    className="feedback-textarea"
                    placeholder={t.suggestionsPlaceholder}
                    value={suggestions}
                    onChange={e => setSuggestions(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div>
                  <span className="feedback-label">{t.emailLabel}</span>
                  <input
                    type="email"
                    className="feedback-input"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="feedback-submit"
                  disabled={submitting || rating === 0}
                >
                  {submitting ? t.submitting : t.submit}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
