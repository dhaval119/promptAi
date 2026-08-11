import pool from '../../lib/db';
import cookie from 'cookie';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { uid, email, name } = req.body;

    try {
        // Check if user exists in DB
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        
        let userId;
        if (rows.length === 0) {
            // New user, insert into DB
            const [result] = await pool.query("INSERT INTO users (name, email, firebase_uid) VALUES (?, ?, ?)", [name, email, uid]);
            userId = result.insertId;
        } else {
            // Existing user
            userId = rows[0].id;
        }

        // Set Cookie so backend remembers the user
        res.setHeader('Set-Cookie', cookie.serialize('user_id', userId, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            sameSite: 'strict',
            path: '/'
        }));

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Authentication failed" });
    }
}