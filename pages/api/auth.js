import pool from '../../lib/db';
import cookie from 'cookie';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { uid, email, name } = req.body;

    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        
        let userId;
        if (rows.length === 0) {
            const [result] = await pool.query(
                "INSERT INTO users (name, email, firebase_uid) VALUES (?, ?, ?)", 
                [name, email, uid]
            );
            userId = result.insertId;
        } else {
            userId = rows[0].id;
        }

        res.setHeader('Set-Cookie', cookie.serialize('user_id', String(userId), {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'strict',
            path: '/'
        }));

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Authentication failed" });
    }
}
