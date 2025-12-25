import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const isHome = router.pathname === '/';
    const body = document.body;
    body.classList.toggle('theme-light', isHome);
    body.classList.toggle('theme-dark', !isHome);
  }, [router.pathname]);

  return <Component {...pageProps} />;
}


