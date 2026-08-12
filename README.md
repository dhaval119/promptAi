# Prompt AI (Next.js)

Next.js rebuild of the original PHP "Prompt AI" college project, made to deploy
on Vercel (which doesn't run PHP). Design is a pixel-match of your original
PHP files on desktop/laptop, with a matching mobile layout added.

**What changed vs. the PHP version, on purpose:**
- No MySQL database - chat history is saved in the visitor's own browser (`localStorage`).
- No login / signup / Firebase - every page is open, no accounts.
- No Stripe / premium paywall - prompt generation is unlimited and free.
- `admin.php` wasn't ported - it was a database-management panel for the
  removed MySQL/user system, so it has no purpose here.
- `details.php`'s "Logout" button is now "Reset" (clears your saved local
  data) since there's no login/session left to log out of. Everything else
  visually is the same.

**What's identical:**
- Every color, font, spacing value, and piece of copy from your PHP files.
- The chat UI (sidebar, landing screen, suggestion buttons, copy button).
- The AI prompt-generation logic (same system prompt, same Gemini → Groq fallback).

## 1. Install

```bash
npm install
```

## 2. Add your API key

```bash
cp .env.example .env.local
```

Open `.env.local` and paste your Gemini key (and optionally a Groq key as a
fallback) - same keys your PHP `promptai_db.php` used:

```
GEMINI_API_KEY=your_real_key
GROQ_API_KEY=your_real_key   # optional
GROQ_MODEL=llama3-70b-8192
PRIMARY_API=gemini
```

`.env.local` is git-ignored, so this never gets pushed to GitHub or exposed
to the browser - it's only read server-side in `pages/api/chat.js`.

## 3. Add your images

Drop your `assets/` folder's images into `public/assets/` - see
`public/assets/README.md` for the exact filenames the code expects.

## 4. Run it locally

```bash
npm run dev
```

Open http://localhost:3000

## 5. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel
```

When it asks for environment variables, add `GEMINI_API_KEY` (and
`GROQ_API_KEY` / `GROQ_MODEL` / `PRIMARY_API` if you're using Groq too) -
or add them afterwards in the Vercel dashboard under
Project → Settings → Environment Variables, then redeploy.

## Pages

| Route        | Replaces      | Notes                                   |
|--------------|---------------|------------------------------------------|
| `/`          | `main.php`    | Landing page                             |
| `/features`  | `features.php`| Feature list accordion                   |
| `/chat`      | `chat.php`    | The actual prompt generator              |
| `/details`   | `details.php` | Local-only profile/preferences           |
| `/api/chat`  | `chat.php`'s POST handler | Calls Gemini/Groq server-side |

`login.php`, `signup.php`, `success.php`, and `admin.php` were intentionally
dropped along with the database/auth/payment system.
