import cookie from 'cookie';

export default function handler(req, res) {
    res.setHeader('Set-Cookie', cookie.serialize('user_id', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        expires: new Date(0), // Instantly expire the cookie
        sameSite: 'strict',
        path: '/'
    }));
    res.status(200).json({ success: true });
}