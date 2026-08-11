export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { msg } = req.body;
  if (!msg || !msg.trim()) return res.status(400).json({ error: 'Message required' });

  const systemPrompt = `You are the world's BEST Prompt Engineer with over 10 years of experience working with Gemini, GPT-4o, Claude 3.5, Groq, and other top AI models.

The user has given a casual situation: '${msg}'

Your only job is to transform this casual input into an **EXTREMELY POWERFUL, HIGHLY DETAILED, and PROFESSIONAL** prompt that will produce the absolute best possible output when used in any AI model.

STRICT RULES (never break these):
1. Output ONLY the final prompt. Do not add any introduction, explanation, 'Here is your prompt', or any extra text.
2. The prompt must be highly detailed, clear, structured, and result-oriented.
3. Include proper role, goal, context, constraints, output format, examples, and step-by-step thinking where needed.
4. Use a professional tone and expert-level instructions.
5. The final prompt should be so powerful and effective that it gives significantly better results than if the user had entered their original situation directly.

Now create a perfect, unique, and high-quality prompt.`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini error:', JSON.stringify(data));
      return res.status(500).json({ error: 'AI failed to generate', details: data });
    }

    const aiText = data.candidates[0].content.parts[0].text.trim();
    return res.status(200).json({ aiText });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
