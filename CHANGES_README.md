# PromptAI Updates (from your request)

## Critical fixes applied

### 1. Same chat history for Google + Email/Password (same email)
- `lib/chatStorage.js` now stores conversations under `conversations_by_email/{normalizedEmail}/items`
- Same email → same recent chats, regardless of login method (Google or manual)
- Still writes a copy under `users/{uid}/conversations` for compatibility
- **You must update Firestore security rules** to allow read/write on `conversations_by_email` for authenticated users (see below)

### 2. Better login error messages
- If account was created with Google, email/password now shows a clear message telling user to use Google button

### 3. ChatGPT + Gemini buttons next to Copy
- After prompt is generated, next to "copy" there are **ChatGPT** and **Gemini** buttons
- ChatGPT: opens chatgpt.com with the prompt pre-filled in the query
- Gemini: copies the prompt and opens gemini.google.com (Gemini does not support reliable URL prefill)

### 4. Admin page (`/admin`)
- Only emails containing "dhaval" or listed ADMIN_EMAILS can access
- Dashboard cards matching your screenshot (Revenue, Active Users, Blocked, etc.)
- Users table with Premium / Block actions (writes to Firestore `users` collection)
- API Settings tab explains env vars (keys stay on server, not in client)

### 5. .gitignore cleaned
- Proper next/node/env ignores so push to GitHub does not fail on secrets or node_modules

## What you need to do

1. **Firestore Security Rules** (Firebase Console → Firestore → Rules):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // admin needs list; tighten later
    }
    match /conversations_by_email/{emailKey}/items/{itemId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId}/conversations/{convId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
(Adjust for production: restrict admin list, etc.)

2. **Firebase Auth settings**
- Authentication → Settings → User account linking → enable "Link accounts that use the same email"
- This prevents duplicate accounts and helps with invalid-credential cases

3. **Env vars** (`.env.local` and Vercel):
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
PRIMARY_API=gemini
```

4. **Admin email**
- Edit `pages/admin.js` → `ADMIN_EMAILS` array if needed

5. **Deploy**
```
cd PromptAi
npm install
npm run build
# then push to GitHub + Vercel, or vercel deploy
```

## Still recommended (not fully coded to keep design 100% intact)
- Full multi-turn conversation (currently one request/response pair per chat)
- Toast notifications (react-hot-toast)
- Loading skeletons for sidebar
- Delete chat button in sidebar
- Mobile swipe for sidebar
- Full dark admin UI variant from your last screenshot
- Profile change logs collection
- API logs collection + UI

Design of login/signup/chat/home was left as-is (no visual redesign). Only functional additions and the new /admin page.

Copy-paste the whole folder or use the zip provided.
