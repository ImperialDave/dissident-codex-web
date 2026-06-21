# Dissident Codex — Web

Next.js website for **Codex**, sharing the same Firebase backend as the Android app (`dissidentcodex`).

## Stack

- Next.js 14, React 18, TypeScript, Tailwind CSS
- Firebase Auth, Firestore, Storage, Cloud Functions
- Zustand, chess.js, react-chessboard

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in Firebase web app keys
npm run dev
```

Open http://localhost:3000

Get Firebase keys from [Firebase Console](https://console.firebase.google.com/) → Project **dissidentcodex** → Project settings → Your apps → Web app.

## Deploy

Hosting services (Render, Railway, Vercel, Firebase App Hosting) build from this repo.

1. Connect this GitHub repo to your host
2. Set environment variables from `.env.local.example`
3. Build command: `npm run build`
4. Start command: `npm start` (or use the host's Next.js preset)

`NEXT_PUBLIC_*` variables must be set **before** the build step.

## Repo layout

This repo is **website source only**. The Android app lives in a separate project.