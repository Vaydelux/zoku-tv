# Zoku TV — Production Deployment & Configuration Guide

## 1. Environment Variables

Configure the following variables in `.env.local` (development) or your hosting provider's environment settings (production):

```bash
# TMDB v4 Read Access Token (JWT starting with "eyJ...")
# When omitted, Zoku TV automatically uses its built-in authentic catalog fallback.
NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN=your_tmdb_v4_jwt_token

# Firebase Client Configuration (Optional for Local Device Mode; required for Cloud Sync)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Optional: Custom SuperEmbed VIP endpoint
NEXT_PUBLIC_SUPEREMBED_VIP_URL=/se_player.php
```

---

## 2. Build & Start Commands

```bash
# 1. Install dependencies
npm ci

# 2. Run strict TypeScript validation
npm run typecheck

# 3. Run unit & security isolation test suite
npm test

# 4. Build production bundle
npm run build

# 5. Start production server
npm run start
```

---

## 3. Firebase & Firestore Deployment

When deploying with a live Firebase project:

1. **Deploy Firestore Security Rules**:
   ```bash
   npm run firebase:deploy:rules
   ```
   Rules are defined in [`firestore.rules`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/firestore.rules) and enforce:
   - Strict `request.auth.uid == userId` path ownership.
   - Schema validation on `profiles`, `watchlist`, `continueWatching`, `watchHistory`, `episodeProgress`, and `searchHistory`.

2. **Deploy Firestore Composite Indexes**:
   ```bash
   npm run firebase:deploy:indexes
   ```
   Indexes are defined in [`firestore.indexes.json`](file:///c:/Users/Jericho.Mosqueda/Downloads/zoku-tv/firestore.indexes.json).

---

## 4. Known Third-Party Provider Limitations

- **External Iframe Black Box**: Zoku TV embeds third-party streaming providers (`vidsrc`, `vidfast`, `2embed`, `filmu`, `cinezo`, etc.) inside a responsive 16:9 container. Zoku TV does not host media files or control internal player scripts.
- **Unverified Playback vs. Confirmed Progress**:
  - When the iframe HTML document finishes loading (`onLoad`), the player header displays **`Container Ready`**.
  - Only when a provider emits runtime `postMessage` progress events does the badge transition to **`Playback Synced`**.
- **Sandbox Compatibility**:
  - Some providers block playback if the HTML5 `sandbox` attribute is present. Users can toggle **Iframe Mode (Strict vs. Compatibility)** or switch servers directly from the control bar below the player.

