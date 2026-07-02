# Zoku TV

A customizable streaming portal built with Next.js — browse TMDB catalogs, manage profiles and watchlists, and stream via embed servers.

## Prerequisites

- Node.js 20+
- [TMDB API](https://www.themoviedb.org/settings/api) Read Access Token
- (Optional) [Firebase](https://console.firebase.google.com/) project for cloud auth & sync

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in your values:

```bash
cp .env.example .env.local
```

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required env vars

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN` | TMDB v4 read access token |

### Optional env vars

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config (see `.env.example`) |
| `NEXT_PUBLIC_APP_URL` | App URL for OAuth (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPEREMBED_VIP_URL` | External PHP host for SuperEmbed VIP player |

Without Firebase config, the app uses a localStorage fallback for auth and profiles.

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.

2. Import the project in [Vercel](https://vercel.com/new).

3. Add environment variables from `.env.example` in **Project → Settings → Environment Variables**:
   - `NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN` (required)
   - All `NEXT_PUBLIC_FIREBASE_*` keys (if using Firebase)
   - `NEXT_PUBLIC_APP_URL` → your production URL (e.g. `https://your-app.vercel.app`)

4. Deploy. Vercel auto-detects Next.js; `vercel.json` and `.npmrc` are included for consistent installs.

### Firebase on Vercel

In Firebase Console → **Authentication → Settings → Authorized domains**, add:

- `your-project.vercel.app`
- Your custom domain (if configured)

Enable **Email/Password** and/or **Google** sign-in under Authentication → Sign-in method.

### SuperEmbed VIP note

`public/se_player.php` requires PHP and **does not run on Vercel**. Host it on a PHP server and set `NEXT_PUBLIC_SUPEREMBED_VIP_URL` to that URL.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
