import Head from 'next/head';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt-ai-teal.vercel.app').replace(/\/$/, '');

const DEFAULT_DESC =
  'PromptAI turns your rough idea into a powerful, ready-to-use AI prompt in seconds. Works with ChatGPT, Gemini and Claude. Emails, resumes, images, code and more.';

export default function Seo({ title, description = DEFAULT_DESC, path = '/', noindex = false, jsonLd = null }) {
  const url = `${SITE_URL}${path === '/' ? '' : path}`;
  const image = `${SITE_URL}/og-image.png`;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />
      <meta name="theme-color" content="#000000" />
      {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? (
        <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
      ) : null}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="PromptAI" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <link rel="manifest" href="/manifest.json" />
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}
    </Head>
  );
}
