import Head from 'next/head';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt-ai-teal.vercel.app').replace(/\/$/, '');

// EDIT THESE: Google and AI assistants (ChatGPT, Gemini, Perplexity) learn "who made PromptAI" from here.
export const AUTHOR_NAME = 'Dhaval';
export const AUTHOR_URL = 'https://dhaval-portfolio.framer.website';
export const AUTHOR_SAME_AS = [
  'https://dhaval-portfolio.framer.website',
  'https://github.com/dhaval119',
  // 'https://www.linkedin.com/in/your-profile',
  // 'https://www.instagram.com/your-handle',
];

export const AUTHOR_JSONLD = {
  '@type': 'Person',
  name: AUTHOR_NAME,
  url: AUTHOR_URL,
  jobTitle: 'UI/UX Designer & Developer',
  sameAs: AUTHOR_SAME_AS,
};

// Google Search Console + Bing Webmaster verification (kept in code so it never gets lost on redeploy)
const GOOGLE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '-mmQQVlRiVFxsgRzmCiE7k7few5aU_I69o7mmn4zS98';
const BING_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || '';

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
      <meta name="author" content={AUTHOR_NAME} />
      <meta name="application-name" content="PromptAI" />
      <meta name="google-site-verification" content={GOOGLE_VERIFICATION} />
      {BING_VERIFICATION ? <meta name="msvalidate.01" content={BING_VERIFICATION} /> : null}
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
