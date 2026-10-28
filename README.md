# AI Jarvis — persoonlijke studiecoach

AI Jarvis is a Dutch-language, browser-based study coach for school Chromebooks; no local app installation is required.

## What's in this repository

- `index.html`: responsive study-coach UI, sign-in/sign-up, chat, subject-detection hints, study modes, text material input, session history, and a browser client for Gemini Live API voice.
- `supabase/functions/jarvis-chat/index.ts`: authenticated, server-side Gemini text tutor endpoint.
- `supabase/functions/jarvis-live-token/index.ts`: authenticated ephemeral-token endpoint for Gemini Live API. The long-lived Gemini key never goes to the browser.
- `supabase/migrations/`: schema and security SQL matching the changes applied to the cloud project.

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

**Never put the Gemini key in `index.html`, a client-side environment variable, or a committed file.** The browser uses only the Supabase publishable key. The backend returns short-lived tokens for the Live API. Gemini API pricing and quotas depend on the Google account and model; Supabase Free does not make third-party model usage automatically free.

### Authentication

Users can create an account and sign in with email/password. If email confirmation is enabled, users need to click the confirmation link before logging in. Chat history and generated study artefacts use Row Level Security policies so each signed-in user can access only their own rows.

In the Supabase dashboard, also open **Authentication → URL Configuration** and add this Redirect URL:
`https://broodjefrikandelmetsaus.github.io/jarvis-studiecoach-web/**`

## Deploy to GitHub Pages

The repository has a GitHub Actions deployment workflow. **The first-time Pages setting still has to be enabled manually** because the connected GitHub integration cannot change repository administration settings:

1. Open https://github.com/broodjefrikandelmetsaus/jarvis-studiecoach-web/settings/pages
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Save if a button appears. A push to `main` should then deploy the site.
4. Check the latest run under the repository's **Actions** tab.

Expected URL after a successful deployment: https://broodjefrikandelmetsaus.github.io/jarvis-studiecoach-web/

The deployment workflow extracts the inline JavaScript module and runs `node --check` before deploying.

## Verified status

- Database migrations are applied.
- Tables `study_sessions`, `study_artifacts`, and `user_preferences` have RLS enabled.
- A temporary probe confirmed the project's database event trigger enables RLS on new public tables; the probe table was dropped afterward.
- Edge Functions `jarvis-chat` and `jarvis-live-token` are deployed with JWT verification enabled.
- Frontend JavaScript syntax is checked in GitHub Actions.

## Current remaining setup

- Set `GEMINI_API_KEY` before expecting real AI answers or live voice.
- Manually enable GitHub Pages once in repository settings; the GitHub connection cannot perform that admin setting.
- Add the Supabase Auth redirect URL above.
- Live voice needs HTTPS and browser microphone permission.
- No AI provider secret is committed in the repository.
