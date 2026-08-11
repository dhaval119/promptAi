import pool from '../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const user_id = req.cookies?.user_id || 1; 
    const { msg } = req.body;
    
    if (!msg) {
        return res.status(400).json({ error: "Message is required" });
    }

    const systemPrompt = `You are the world's BEST Prompt Engineer. Convert the user's request into a high-quality, production-ready AI prompt. User request: ${msg}`;
    
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: systemPrompt }] }] 
                })
            }
        );
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0]) {
            console.error("Gemini response:", JSON.stringify(data));
            return res.status(500).json({ error: "AI response failed", details: data });
        }
        
        const aiText = data.candidates[0].content.parts[0].text;
        
        try {
            await pool.query(
                "INSERT INTO conversations (user_id, request, response) VALUES (?, ?, ?)", 
                [user_id, msg, aiText]
            );
        } catch (dbErr) {
            console.error("DB insert error:", dbErr.message);
            // still return the AI text even if DB fails
        }
        
        res.status(200).json({ aiText });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "AI request failed" });
    }
}
