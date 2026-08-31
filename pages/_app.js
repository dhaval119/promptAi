import Head from 'next/head';
import '../styles/globals.css';
import { AuthProvider } from '../lib/AuthContext';

const SITE_URL = 'https://prompt-ai-teal.vercel.app';
const OG_IMAGE = `${SITE_URL}/og-image.png?v=3`;

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#020202" />
        <meta name="description" content="PromptAI – Turn any situation into a powerful AI prompt." />

        {/* Open Graph – black bg logo, no white plate */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PromptAI" />
        <meta property="og:title" content="PromptAI" />
        <meta
          property="og:description"
          content="Turn any situation into a powerful AI prompt."
        />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:secure_url" content={OG_IMAGE} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="PromptAI" />

        {/* Twitter / WhatsApp */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PromptAI" />
        <meta
          name="twitter:description"
          content="Turn any situation into a powerful AI prompt."
        />
        <meta name="twitter:image" content={OG_IMAGE} />

        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
