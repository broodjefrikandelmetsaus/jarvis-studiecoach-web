# AI Jarvis — persoonlijke studiecoach

AI Jarvis is een Dutch-language, browser-based study coach designed for school Chromebooks; no local app installation is required.

## What's in this repository

- `index.html`: responsive study-coach UI, sign-in/sign-up, chat, subject detection hints, study modes, text material upload, session history, and a native browser Live API voice client.
- `supabase/functions/jarvis-chat/index.ts`: authenticated server-side Gemini text tutor endpoint.
- `supabase/functions/jarvis-live-token/index.ts`: authenticated ephemeral-token endpoint for Gemini Live API. The long-lived Gemini key never goes to the browser.
- `supabase/migrations/`: database schema and hardening SQL, matching the changes applied to the cloud project.

## Supabase project

- Organization: `Ai Jarvis`
- Project: `Ai Jarvis Learning`
- Ref: `srtxzvvjtuuiwledxxok`
- Region: `eu-west-1`
- Project URL: https://srtxzvvjtuuiwledxxok.supabase.co

### One-time secret configuration

In the Supabase dashboard for **AI Jarvis Learning**, open **Edge Functions → Secrets** and add:

- Name: `GEMINI_API_KEY`
- Value: your Gemini API key from Google AI Studio

Optional secret: `GEMINI_TEXT_MODEL` (defaults to `gemini-3.8-flash`).

**Never put the Gemini key in `index.html`, a GitHub secret that is exposed to client code, or a committed file.** The browser uses only the Supabase publishable key. The backend returns short-lived tokens for the Live API. Gemini API pricing/quotas depend on the Google account and model; the Supabase Free plan does not make third-party model usage automatically free.

### Authentication

Users can create an account and sign in with email/password. If email confirmation is enabled, users need to click the confirmation link before logging in. Chat history and generated study artefacts use Row Level Security policies so each signed-in user can access only their own rows.

## Deploy to GitHub Pages

The repository has a GitHub Actions deployment workflow. **The first-time Pages setting still has to be enabled manually** because the connected GitHub integration cannot change repository administration settings:

1. Open https://github.com/broodjefrikandelmetsaus/jarvis-studiecoach-web/settings/pages
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Save if a button appears. A push to `main` should then deploy the site.
4. Check the latest run under the repository's **Actions** tab.

Expected URL after a successful deployment: https://broodjefrikandelmetsaus.github.io/jarvis-studiecoach-web/

The deployment workflow extracts the inline JavaScript module and runs `node --check` before deployment.

## Current limitations / next features

- Set `GEMINI_API_KEY` before expecting real AI answers or voice conversations.
- Live voice needs a browser that supports microphone access and secure HTTPS. Chrome on a Chromebook should work once the site is deployed and microphone permission is granted.
- The first version uses a short-lived Gemini Live API token, bidirectional PCM audio, and output/input transcriptions. Full session recovery/resumption and cross-device realtime sync UI can be improved further.
- No API secret is committed in this repository.
