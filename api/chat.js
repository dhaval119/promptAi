import pool from '../../lib/db';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    // (Simulated Session ID - In production use JWT cookies)
    const user_id = req.cookies.user_id || 1; 
    
    const { msg, chat_id } = req.body;
    
    if (msg) {
        const systemPrompt = `You are the world's BEST Prompt Engineer... (User request: ${msg})`;
        
        try {
            // Using Gemini API securely from backend
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
            });
            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;
            
            // Insert into DB
            await pool.query("INSERT INTO conversations (user_id, request, response) VALUES (?, ?, ?)", [user_id, msg, aiText]);
            
            res.status(200).json({ aiText });
        } catch (error) {
            res.status(500).json({ error: "AI request failed" });
        }
    }
}