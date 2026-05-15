import { useState, useEffect } from 'react';
import type { Lang } from '../../i18n/translations';
import './AddToHomeScreen.css';

const STORAGE_KEY = 'epicalc-a2hs-dismissed';

const text = {
  en: {
    title: 'Add EpiCalc to your home screen',
    subtitle: 'for quick access — works offline too!',
    ios: 'iPhone: Share → Add to Home Screen',
    android: 'Android: Menu → Add to Home Screen',
  },
  ko: {
    title: '홈 화면에 추가하면 앱처럼 사용 가능합니다',
    subtitle: '오프라인에서도 작동해요!',
    ios: 'iPhone: 공유 → 홈 화면에 추가',
    android: 'Android: 메뉴 → 홈 화면에 추가',
  },
} as const;

interface Props {
  lang: Lang;
}

export default function AddToHomeScreen({ lang }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = window.innerWidth < 768;
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';

    if (isMobile && !isStandalone && !isDismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  const t = text[lang];

  return (
    <div className="a2hs-banner" role="banner">
      <span className="a2hs-icon" aria-hidden="true">📱</span>
      <div className="a2hs-content">
        <p className="a2hs-title">{t.title}</p>
        <p className="a2hs-subtitle">{t.subtitle}</p>
        <div className="a2hs-hints">
          <span>{t.ios}</span>
          <span>{t.android}</span>
        </div>
      </div>
      <button className="a2hs-close" onClick={dismiss} aria-label="Close banner">✕</button>
    </div>
  );
}
