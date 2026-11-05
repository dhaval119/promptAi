// pages/api/chat.js
// Serverless replacement for the PHP callGemini()/callGroq() pipeline.
// No database, no login, no payment - just: text in -> refined prompt out.

function todayIST() {
  return new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const DETAILS_MARK = 'Details provided by user:';

const SYSTEM_PROMPT = (userText) => `You are the world's BEST Prompt Engineer with over 10 years of experience working with Gemini, GPT-4o, Claude 3.5, Groq, and other top AI models.

Today's date: ${todayIST()}.

The user has given a casual situation: '${userText}'

Your only job is to transform this casual input into an EXTREMELY POWERFUL, HIGHLY DETAILED, and PROFESSIONAL prompt that will produce the absolute best possible output when used in any AI model.

STRICT RULES (never break these):
1. Output ONLY the final prompt. Do not add any introduction, explanation, 'Here is your prompt', or any extra text.
2. The prompt must be highly detailed, clear, structured, and result-oriented.
3. Include proper role, goal, context, constraints, output format, examples, and step-by-step thinking where needed.
4. Use a professional tone and expert-level instructions.
5. The final prompt should be so powerful and effective that it gives significantly better results than if the user had entered their original situation directly.
6. If the situation contains a block called "${DETAILS_MARK}", use EVERY detail from it literally inside the prompt (names, company, dates, reasons, tone, language). Never invent placeholders like [Your Name] for details that were provided.

Now create a perfect, unique, and high-quality prompt.`;

// One call that either asks the user for the missing details or directly returns the final prompt.
const SMART_PROMPT = (userText) => `You are the world's BEST Prompt Engineer (10+ years, Gemini / GPT-4o / Claude / Groq).

Today's date: ${todayIST()}.

The user typed this casual request: '${userText}'

STEP 1 - DECIDE: does a great result REQUIRE personal / specific details the user did NOT give?
Ask for details ONLY for tasks like: emails, letters, leave / job / bank applications, resumes, cover letters, messages to a person, invitations, social posts or ads for a specific business, speeches, complaints, reports about a specific person/company.
Do NOT ask for generic tasks (explain a concept, write code, recipe, ideas, summary, translation, general how-to) - go straight to STEP 3.
Never ask about something the user already told you.

STEP 2 - IF details are missing, output EXACTLY this and nothing else:
[[ASK]]
{"intro":"<one short friendly line in the user's language style (Hinglish if they wrote Hinglish)>","questions":[{"id":"snake_case","label":"<short question>","type":"text|textarea|date|date_range|select","placeholder":"<example>","options":["only for select"],"required":true|false}]}

Rules for questions:
- Maximum 6 questions, most important first, short labels.
- Email / letter: ask recipient name (and designation), sender's name, company / school / organization, the exact reason or key points, tone (select), and language (select) if not obvious.
- Dates: if one day is enough use type "date"; if it can span several days (leave, trip, event, deadline) use type "date_range" (from - to). Also ask the date for applications / invitations / events.
- Mark only the truly necessary ones as required:true, the rest false.
- Valid JSON only, no markdown fences.

STEP 3 - OTHERWISE output ONLY the final, EXTREMELY POWERFUL, HIGHLY DETAILED, professional prompt (role, goal, context, constraints, output format, examples, step-by-step thinking where needed). No introduction, no explanation, no "Here is your prompt". It must never start with [[ASK]].`;

const IMAGE_PROMPT = (userText) => `You are an expert at reverse-engineering AI-generated images into prompts for AI image generators (ChatGPT / GPT-image, Gemini / Imagen, Midjourney, Flux, Stable Diffusion).

The user attached an image and wrote: '${userText}'

Study the image extremely carefully and write ONE prompt that would recreate it as EXACTLY as possible. Cover, in a natural flowing structure:
- Subject(s): count, gender presentation, approximate age range, expression, pose, gaze, hands, body position
- Hair, skin tone, makeup, outfit (every garment, colors, fabric, fit, accessories, jewelry)
- Setting / background: location, props, depth, time of day, weather
- Lighting: type, direction, softness, color temperature, shadows, highlights
- Camera: shot type, angle, lens (mm), aperture / depth of field, framing, composition
- Style: photorealistic / cinematic / editorial / anime / 3D render / illustration, color grading, film look, texture, mood, quality keywords
- Aspect ratio (match the image), and a short "Negative prompt" line (what to avoid)

RULES:
1. Output ONLY the final prompt. No intro, no explanation.
2. Never identify or name any real person; describe people only by visible traits.
3. If the user may upload their own photo to get this trend, end with one line: "If a reference photo is attached, keep that person's face and identity exactly the same and apply everything above."
4. If the image shows nudity, sexual content, or a minor in a sexualized way, output only: "I can't create a prompt for this image."
5. Write the prompt in English unless the user clearly asked for another language.`;

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
].filter((m, i, arr) => arr.indexOf(m) === i);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geminiOnce(model, prompt, key, image, withThinkingOff) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const parts = [{ text: prompt }];
  if (image) parts.push({ inlineData: { mimeType: image.mime, data: image.data } });
  const generationConfig = { maxOutputTokens: 2048, temperature: 0.7 };
  // Gemini 2.5 Flash "thinks" before answering, which adds many seconds. A prompt rewrite does not need it.
  if (withThinkingOff && /2\.5-flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig }),
      signal: ctrl.signal,
    });
    if (!res.ok) return { status: res.status };
    const data = await res.json();
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || '')
      .join('')
      .trim();
    return text ? { text } : { status: 204 };
  } catch {
    return { status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

// Tries the main model, retries temporary errors (429 / 5xx / timeout) and falls back to lighter models.
async function callGemini(prompt, key, image, deadline) {
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() > deadline) return false;
      let r = await geminiOnce(model, prompt, key, image, true);
      if (r.status === 400) r = await geminiOnce(model, prompt, key, image, false);
      if (r.text) return r.text;
      if (r.status === 400 || r.status === 403 || r.status === 404) break; // this model is unusable -> next model
      await sleep(350 * (attempt + 1));
    }
  }
  return false;
}

async function callGroq(prompt, key, model, image) {
  const useModel = image
    ? process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
    : model;
  const content = image
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.data}` } },
      ]
    : prompt;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: useModel,
          messages: [{ role: 'user', content }],
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: ctrl.signal,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } else if (![429, 500, 502, 503].includes(res.status)) {
        return false;
      }
    } catch {
      // timeout / network -> retry once
    } finally {
      clearTimeout(timer);
    }
    await sleep(400);
  }
  return false;
}

const QUESTION_TYPES = ['text', 'textarea', 'date', 'date_range', 'select'];

// Parses the "[[ASK]] {json}" reply. Returns null when it is not a valid, usable question list.
function parseAsk(raw) {
  if (typeof raw !== 'string' || !raw.trim().startsWith('[[ASK]]')) return null;
  try {
    let body = raw.trim().slice(7).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start < 0 || end < start) return null;
    const j = JSON.parse(body.slice(start, end + 1));
    const seen = new Set();
    const questions = (Array.isArray(j.questions) ? j.questions : [])
      .map((q, idx) => {
        const type = QUESTION_TYPES.includes(q?.type) ? q.type : 'text';
        let id = String(q?.id || `q${idx + 1}`).replace(/[^a-z0-9_]/gi, '_').slice(0, 30) || `q${idx + 1}`;
        if (seen.has(id)) id = `${id}_${idx}`;
        seen.add(id);
        const options =
          type === 'select' && Array.isArray(q?.options)
            ? q.options.map((o) => String(o).slice(0, 40)).filter(Boolean).slice(0, 8)
            : undefined;
        return {
          id,
          label: String(q?.label || '').trim().slice(0, 120),
          type: type === 'select' && (!options || options.length < 2) ? 'text' : type,
          placeholder: String(q?.placeholder || '').trim().slice(0, 100),
          options,
          required: q?.required === true,
        };
      })
      .filter((q) => q.label)
      .slice(0, 6);
    if (!questions.length) return null;
    return { intro: String(j.intro || '').trim().slice(0, 200), questions };
  } catch {
    return null;
  }
}

// Starts the primary model. If it is slow (6s) or fails, the backup model starts too and the first good answer wins.
async function runModels({ prompt, image, primary, geminiKey, groqKey, groqModel }) {
  const deadline = Date.now() + 24000;
  const g = geminiKey ? () => callGemini(prompt, geminiKey, image, deadline) : null;
  const q = groqKey ? () => callGroq(prompt, groqKey, groqModel, image) : null;
  const [first, second] = primary === 'groq' ? [q, g] : [g, q];
  const a = first || second;
  const b = first ? second : null;
  if (!a) return false;
  if (!b) return await a();

  const pa = a().catch(() => false);
  const hedge = new Promise((r) => setTimeout(r, 6000, 'hedge'));
  const early = await Promise.race([pa, hedge]);
  if (early && early !== 'hedge') return early;

  const pb = b().catch(() => false);
  if (early === false) return await pb;
  return await Promise.race([pa.then((v) => v || pb), pb.then((v) => v || pa)]);
}

// --- Basic in-memory rate limiting -----------------------------------
// Best-effort only: serverless instances can be recycled at any time, so
// this is not a substitute for real rate limiting (e.g. Vercel Edge Config,
// Upstash Redis) in front of the route, but it stops naive rapid-fire abuse
// from a single warm instance without adding any new dependency.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const rateLimitHits = new Map();

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  // Opportunistic cleanup to avoid unbounded growth on long-lived instances
  if (rateLimitHits.size > 5000) {
    for (const [k, v] of rateLimitHits) {
      if (now - v.windowStart > RATE_LIMIT_WINDOW_MS * 2) rateLimitHits.delete(k);
    }
  }
  const entry = rateLimitHits.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitHits.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) return true;
  return false;
}

const MAX_MESSAGE_LENGTH = 8000;

export default async function handler(req, res) {
  // Security headers for this endpoint
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Basic body size / content-type guard
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (!ct.includes('application/json')) {
    return res.status(415).json({ error: 'unsupported_media_type' });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: 'rate_limited',
      text: 'Too many requests. Please wait a moment and try again.',
    });
  }

  const rawText = req.body?.msg;
  if (typeof rawText !== 'string') {
    return res.status(400).json({ error: 'invalid_message' });
  }

  // Strip control characters (except newline/tab) so nothing odd reaches the AI APIs
  const userText = rawText
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);

  if (!userText) {
    return res.status(400).json({ error: 'empty_message' });
  }

  // Optional image (screenshot -> exact prompt). The browser already shrinks it.
  let image = null;
  const rawImg = req.body?.image;
  if (rawImg) {
    const mime = String(rawImg.mime || '').toLowerCase();
    let data = String(rawImg.data || '').replace(/^data:[^,]*,/, '');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime) || !/^[A-Za-z0-9+/=]+$/.test(data.slice(0, 200))) {
      return res.status(400).json({ error: 'invalid_image' });
    }
    if (data.length > 3_500_000) {
      return res.status(413).json({ error: 'image_too_large', text: 'Image is too large. Please use a smaller screenshot.' });
    }
    image = { mime, data };
  }

  const geminiKey = process.env.GEMINI_API_KEY || '';
  const groqKey = process.env.GROQ_API_KEY || '';
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const primary = (process.env.PRIMARY_API || 'gemini').toLowerCase();
  const cfg = { primary, geminiKey, groqKey, groqModel };

  const title = userText.length > 45 ? userText.slice(0, 45) + '...' : userText;
  const failed = () =>
    res.status(200).json({
      error: 'generation_failed',
      text: 'Oops! Our AI just tripped over a cable and face-planted. 🙈 Refresh the page and try again, it usually behaves after that.',
    });

  try {
    // ---------- IMAGE -> PROMPT ----------
    if (image) {
      const out = await runModels({ ...cfg, prompt: IMAGE_PROMPT(userText), image });
      if (out === false) return failed();
      return res.status(200).json({ text: out, title: 'Image to prompt' });
    }

    // ---------- SMART: ask for missing details OR generate ----------
    // Skipped when the client says "direct", when answers were already supplied, or the request is already long/detailed.
    const mode = req.body?.mode === 'direct' ? 'direct' : 'auto';
    const canAsk = mode === 'auto' && !userText.includes(DETAILS_MARK) && userText.length <= 400;

    if (canAsk) {
      const out = await runModels({ ...cfg, prompt: SMART_PROMPT(userText) });
      if (out === false) return failed();
      if (out.startsWith('[[ASK]]')) {
        const ask = parseAsk(out);
        if (ask) return res.status(200).json({ needs_info: true, ...ask, title });
        // Unparseable question list -> fall back to a normal generation below
      } else {
        return res.status(200).json({ text: out, title });
      }
    }

    const out = await runModels({ ...cfg, prompt: SYSTEM_PROMPT(userText) });
    if (out === false) return failed();
    return res.status(200).json({ text: out, title });
  } catch (err) {
    return failed();
  }
}

export const config = {
  maxDuration: 30,
  api: { bodyParser: { sizeLimit: '4mb' } },
};
