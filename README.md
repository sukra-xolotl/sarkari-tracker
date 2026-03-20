# Sarkari Exam Tracker — Setup & Deployment Guide

## Project Structure

```
sarkari-tracker/
├── netlify.toml                    ← Tells Netlify how to build
├── package.json                    ← JS dependencies
├── vite.config.js                  ← Build tool config
├── index.html                      ← Entry HTML
├── src/
│   ├── main.jsx                    ← React entry point
│   └── App.jsx                     ← Main app (all tabs)
└── netlify/
    └── functions/
        ├── sarkari-proxy.js        ← Fetches SarkariResult RSS (server-side)
        └── gemini-search.js        ← Calls Gemini API (server-side)
```

---

## Step 1 — Prerequisites (install once)

```bash
# Install Node.js from https://nodejs.org (LTS version)
# Then install Git from https://git-scm.com

# Verify both are installed
node --version    # should show v18+ or v20+
git --version     # should show git version 2.x
```

---

## Step 2 — Set up VS Code + Git

```bash
# Open VS Code, then open the terminal (Ctrl + `)

# Configure Git with your identity (one-time setup)
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## Step 3 — Create GitHub Repository

1. Go to https://github.com → click **New repository**
2. Name it `sarkari-tracker`
3. Keep it **Public** (required for free Netlify)
4. Do NOT add README or .gitignore (we'll push our own files)
5. Copy the repository URL shown (e.g. `https://github.com/yourname/sarkari-tracker.git`)

---

## Step 4 — Push code to GitHub

```bash
# In VS Code terminal, navigate to your project folder
cd path/to/sarkari-tracker

# Install dependencies
npm install

# Initialise Git
git init
git add .
git commit -m "Initial commit — Sarkari Exam Tracker"

# Link to GitHub and push
git remote add origin https://github.com/YOURUSERNAME/sarkari-tracker.git
git branch -M main
git push -u origin main
```

After this, your code is live on GitHub.
Every future change is just: `git add . && git commit -m "message" && git push`

---

## Step 5 — Get your Gemini API Key (FREE)

1. Go to https://aistudio.google.com
2. Sign in with Google account
3. Click **Get API Key** → **Create API Key**
4. Copy the key (starts with `AIza...`)
5. The free tier gives you: **15 requests/minute, 1 million tokens/day** — more than enough

---

## Step 6 — Deploy on Netlify

1. Go to https://netlify.com → Sign up (free)
2. Click **Add new site** → **Import an existing project**
3. Connect to **GitHub** → select your `sarkari-tracker` repo
4. Netlify auto-detects the `netlify.toml` settings — just click **Deploy site**
5. Wait ~2 minutes for the first build

### Set Environment Variable (IMPORTANT — do this before testing)

1. In Netlify dashboard → **Site settings** → **Environment variables**
2. Click **Add a variable**
3. Key: `GEMINI_API_KEY`
4. Value: paste your Gemini API key from Step 5
5. Click **Save** → go to **Deploys** → **Trigger deploy** → **Deploy site**

Your site is now live at `https://random-name.netlify.app` (you can rename it)

---

## Step 7 — Test locally (optional but recommended)

```bash
# Install Netlify CLI to test functions locally
npm install -g netlify-cli

# Create a .env file for local development
echo "GEMINI_API_KEY=your_key_here" > .env

# Run the full stack locally (React + Netlify Functions)
netlify dev

# Visit http://localhost:8888
```

---

## How each piece works

| File | What it does | Why |
|------|-------------|-----|
| `src/App.jsx` | Frontend React app (JSX) | Runs in browser |
| `netlify/functions/sarkari-proxy.js` | Fetches SarkariResult RSS | Runs on server → no CORS |
| `netlify/functions/gemini-search.js` | Calls Gemini API | API key stays server-side → secure |
| `netlify.toml` | Build + routing config | Tells Netlify what to run |

---

## Why NOT Python for the frontend?

- Browsers only understand JavaScript natively
- Python would require a separate backend server (costs money, more complexity)
- Node.js (JS) serverless functions on Netlify are **free** and stay in one ecosystem
- Python is great IF you want to write a separate scraper bot (optional extension)

---

## Why JSX instead of plain JavaScript?

JSX = JavaScript + HTML syntax. It compiles to plain JS.
Plain JS works too, but JSX + React makes building UIs with state much easier.
The final deployed file IS plain JavaScript — JSX is only in development.

---

## Future improvements

- Add more RSS sources: Employment News, FreeJobAlert, IndGovtJobs
- Add browser push notifications (PWA)
- Add a Python scraper (separate service) for Telegram channel monitoring
- Add a PostgreSQL database to persist bookmarks across devices
