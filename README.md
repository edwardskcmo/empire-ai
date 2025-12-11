# Empire AI

Operational Intelligence Platform for Empire Remodeling.

## Features

- **Dashboard** — Quick chat, activity feed, quick actions
- **Knowledge Base** — Department-organized documents and insights
- **Issues Board** — Track and resolve problems with archive system
- **Chat** — AI assistant with department-specific context
- **Voice Mode** — Hands-free interaction (demo)
- **Team Management** — Invite members, assign roles
- **Central Intelligence** — Auto-learns from all company data
- **Help/FAQ** — Team training documentation

## Deployment to Vercel

### Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in (or create account)
2. Click the **+** icon (top right) → **New repository**
3. Name it `empire-ai`
4. Keep it **Public** or **Private** (your choice)
5. Click **Create repository**

### Step 2: Upload Files

1. On your new repo page, click **uploading an existing file**
2. Drag and drop ALL files from this folder:
   - `package.json`
   - `vite.config.js`
   - `index.html`
   - `src/` folder (with main.jsx and App.jsx inside)
   - `public/` folder (with favicon.svg inside)
3. Click **Commit changes**

### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New...** → **Project**
3. Find and select your `empire-ai` repository
4. Vercel will auto-detect it's a Vite project
5. Click **Deploy**
6. Wait ~1 minute for deployment
7. You'll get a live URL like `empire-ai.vercel.app`

## Updating the App

### To make changes:

1. Get updated `App.jsx` file from Claude
2. Go to your GitHub repo
3. Navigate to `src/App.jsx`
4. Click the **pencil icon** (edit)
5. Delete all content, paste new code
6. Click **Commit changes**
7. Vercel auto-deploys in ~30 seconds

## Local Development (Optional)

If you want to run it on your computer:

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Tech Stack

- React 18
- Vite (build tool)
- Lucide React (icons)
- localStorage (data persistence)

## Support

Built by ContractorsMVP for Empire Remodeling.
