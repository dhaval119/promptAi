// pages/api/chat.js
// Serverless replacement for the PHP callGemini()/callGroq() pipeline.
// No database, no login, no payment - just: text in -> refined prompt out.

const SYSTEM_PROMPT = (userText) => `You are the world's BEST Prompt Engineer with over 10 years of experience working with Gemini, GPT-4o, Claude 3.5, Groq, and other top AI models.

The user has given a casual situation: '${userText}'

Your only job is to transform this casual input into an EXTREMELY POWERFUL, HIGHLY DETAILED, and PROFESSIONAL prompt that will produce the absolute best possible output when used in any AI model.

STRICT RULES (never break these):
1. Output ONLY the final prompt. Do not add any introduction, explanation, 'Here is your prompt', or any extra text.
2. The prompt must be highly detailed, clear, structured, and result-oriented.
3. Include proper role, goal, context, constraints, output format, examples, and step-by-step thinking where needed.
4. Use a professional tone and expert-level instructions.
5. The final prompt should be so powerful and effective that it gives significantly better results than if the user had entered their original situation directly.

Now create a perfect, unique, and high-quality prompt.`;

async function callGemini(prompt, key) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? text.trim() : false;
}

async function callGroq(prompt, key, model) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  return text ? text.trim() : false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const userText = (req.body?.msg || '').toString().trim();
  if (!userText) {
    return res.status(400).json({ error: 'empty_message' });
  }

  const geminiKey = process.env.GEMINI_API_KEY || '';
  const groqKey = process.env.GROQ_API_KEY || '';
  const groqModel = process.env.GROQ_MODEL || 'llama3-70b-8192';
  const primary = (process.env.PRIMARY_API || 'gemini').toLowerCase();

  const prompt = SYSTEM_PROMPT(userText);
  let aiText = false;

  try {
    if (primary === 'groq' && groqKey) {
      aiText = await callGroq(prompt, groqKey, groqModel);
      if (aiText === false && geminiKey) aiText = await callGemini(prompt, geminiKey);
    } else {
      if (geminiKey) aiText = await callGemini(prompt, geminiKey);
      if (aiText === false && groqKey) aiText = await callGroq(prompt, groqKey, groqModel);
    }
  } catch (err) {
    aiText = false;
  }

  if (aiText === false) {
    return res.status(200).json({
      error: 'generation_failed',
      text: 'Error generating prompt. Please check your API keys in .env.local and try again.',
    });
  }

  const title = userText.length > 45 ? userText.slice(0, 45) + '...' : userText;
  return res.status(200).json({ text: aiText, title });
}
