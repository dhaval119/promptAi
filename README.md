# PromptMagic - AI Prompt Generator

Exact design from your original PHP college project, converted to Next.js so it works on **Vercel**.

## Pages
- `/` - Home (main.php design)
- `/chat` - Chat interface (chat.php design)
- `/login` - Login
- `/signup` - Signup
- `/features` - Features
- `/details` - Account

## Setup

1. Put your **assets folder** inside `public/assets/`
   (ailogo.png, video.gif, main12.gif, signup.png, google.png, copy.png, send.png, arrow.png, arrow2.png etc.)

2. Create `.env.local`:
```
GEMINI_API_KEY=your_gemini_key_here
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

3. Install & run:
```
npm install
npm run dev
```

4. Deploy to Vercel:
- Push to GitHub
- Import project in Vercel
- Add the same Environment Variables
- Deploy

## Notes
- Design is kept **exact** as PHP (same CSS, same layout)
- Responsive media queries added for mobile
- Chat uses Gemini API via `/api/chat`
- Google login uses Firebase
- Database / sessions removed for simplicity (demo mode)
- Manual login just redirects to chat (no real password check without DB)
