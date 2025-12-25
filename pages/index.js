import Head from 'next/head';
import styles from '../styles/Index.module.css';

export default function Home() {
  return (
    <>
      <Head>
        <title>manpa</title>
        <meta name="description" content="manpa" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </Head>

      <main className={styles.main}>
        <div className={styles.brand}>manpa</div>
      </main>
    </>
  );
}


