# CloudST Scribe

**Speak it. Copy it. Paste it.** The fastest way to get words on the page.

A minimalistic, POPIA-safe dictation web app tuned specifically for South African English (`en-ZA`).
Zero backend — speech recognition runs entirely in your browser via the native **Web Speech API**.
No logins, no servers, no storage. Close the tab and everything is gone.

## Demo links
- Live: deploy the `dist/` folder (or connect the repo) to Vercel — zero config needed.

## Quick start

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build → dist/
npm run preview  # preview the production build
```

## Browser support

| Supported | Not supported |
| --- | --- |
| Google Chrome, Microsoft Edge, Brave | Safari, Firefox |

An internet connection is required (the browser uses Google's secure cloud speech engine for
high-accuracy en-ZA recognition) — but **no audio is ever saved by CloudST**.

## Features

- **Continuous listening** — the session auto-restarts when the browser drops it (~60 s of silence), so you can pause to think mid-dictation.
- **Live interim text** — words appear as you speak; perfected phrases are flushed as finals.
- **Smart spacing** — finalised chunks are joined cleanly.
- **Light / Dark theme** — toggle in the header; respects your OS preference on first visit and remembers your choice.
- **Mobile-first** — thumb-reach sticky control bar, safe-area insets, large touch targets; scales gracefully to desktop.
- **RF 5223 safe** — `env(safe-area-inset-*)` padding keeps controls clear of home-bar/handset humps.

## Project structure

```
├── index.html                    # favicon, meta, FOUC-free theme bootstrap
├── public/
│   ├── favicon.png               # CloudST emblem favicon
│   └── logo.png                  # CloudST wordmark (header)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                 # Tailwind directives + brand backdrop
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts  # Web Speech API wrapper (en-ZA, continuous)
│   │   └── useTheme.ts              # light/dark toggle + OS sync
│   └── components/
│       ├── Scribe.tsx            # the app UI (header, textarea, sticky controls)
│       └── ThemeToggle.tsx       # sun/moon toggle button
├── tailwind.config.js            # brand palette (gold `brand`, dark `ink`), darkMode: 'class'
└── vite.config.ts
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project** → import the repo.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output `dist`.
4. Deploy. Done — no environment variables, no backend.

## Privacy & POPIA

- **No backend, no storage** — recognition happens entirely within your web browser.
- **Zero data retention** — audio is never recorded, stored, or transmitted to any CloudST server.
- **POPIA-safe** — client conversations can never leak because they never exist outside your browser session.
