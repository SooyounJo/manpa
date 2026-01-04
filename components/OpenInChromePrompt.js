import { useEffect, useState } from 'react';

export default function OpenInChromePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const ua = navigator.userAgent || '';
      const isKakaoInApp = /KAKAOTALK/i.test(ua);
      // 보여주기: 카카오 인앱 브라우저에서만
      setShow(isKakaoInApp);
    } catch {
      setShow(false);
    }
  }, []);

  const openInChrome = () => {
    try {
      const ua = navigator.userAgent || '';
      const href = window.location.href;
      const isAndroid = /Android/i.test(ua);
      const isiOS = /iPhone|iPad|iPod/i.test(ua);

      if (isAndroid) {
        const proto = window.location.protocol.replace(':', '');
        const intentUrl =
          `intent://${window.location.host}${window.location.pathname}${window.location.search}` +
          `#Intent;scheme=${proto};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
        window.location.href = intentUrl;
        return;
      }
      if (isiOS) {
        const chromeUrl = href
          .replace(/^https:\/\//, 'googlechromes://')
          .replace(/^http:\/\//, 'googlechrome://');
        const t = Date.now();
        window.location.href = chromeUrl;
        // 설치 안되어 있으면 앱스토어로 유도
        setTimeout(() => {
          if (Date.now() - t < 1500) {
            window.location.href = 'https://apps.apple.com/app/id535886823';
          }
        }, 1200);
        return;
      }
      // 기타 환경: 그냥 닫기
      setShow(false);
    } catch {
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'grid',
      placeItems: 'center',
      zIndex: 3000,
      background: 'rgba(0,0,0,0.45)',
      padding: 24,
    }}>
      <div style={{
        width: 300,
        background: 'rgba(0,0,0,0.86)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: '16px 16px 0 16px',
        color: '#fff',
        textAlign: 'center',
      }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
          Chrome에서 열기 권장
        </div>
        <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 12 }}>
          카카오 인앱 브라우저에서는 일부 기능이 제한될 수 있어요
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.18)', display: 'flex' }}>
          <button
            type="button"
            onClick={() => setShow(false)}
            style={{
              flex: 1,
              padding: '14px 0',
              background: 'transparent',
              color: '#fff',
              border: 0,
              borderRight: '1px solid rgba(255,255,255,0.18)',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={openInChrome}
            style={{
              flex: 1,
              padding: '14px 0',
              background: 'transparent',
              color: '#fff',
              border: 0,
              cursor: 'pointer',
            }}
          >
            Chrome으로 열기
          </button>
        </div>
      </div>
    </div>
  );
}


