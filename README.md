# AI Jarvis — persoonlijke studiecoach

AI Jarvis is a Dutch-language, browser-based study coach for school Chromebooks; no local app installation is required.

## Open the website

**Live website:** https://broodjefrikandelmetsaus.github.io/jarvis-studiecoach-web/

**Direct preview fallback:** https://srtxzvvjtuuiwledxxok.supabase.co/functions/v1/jarvis-web

GitHub Pages deployment is enabled and a recent workflow run completed successfully. The workflow checks the inline JavaScript syntax, uploads the static page, and deploys to GitHub Pages when `index.html` or the deployment workflow changes.

## What's in this repository

- `index.html`: responsive study-coach UI, sign-in/sign-up, chat, subject-detection hints, study modes, text material input, session history, realtime history updates, and a browser client for Gemini Live API voice.
- `supabase/functions/jarvis-web/index.ts`: public, read-only HTML preview endpoint.
- `supabase/functions/jarvis-chat/index.ts`: authenticated server-side Gemini text tutor endpoint.
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
- Value: your Gemini API key from Google AI Studio: https://aistudio.google.com/app/apikey

Optional secret: `GEMINI_TEXT_MODEL` (defaults to `gemini-3.8-flash`).

**Never put the Gemini key in `index.html`, a client-side environment variable, or a committed file.** The browser uses only the Supabase publishable key. The backend returns short-lived tokens for the Live API. Gemini API pricing and quotas depend on the Google account and model; Supabase Free does not make third-party model usage automatically free.

### Authentication redirects

Users can create an account and sign in with email/password. If email confirmation is enabled, users need to click the confirmation link before logging in.

In Supabase Dashboard → **Authentication → URL Configuration**, add these redirect URLs:
- `https://broodjefrikandelmetsaus.github.io/jarvis-studiecoach-web/**`
- `https://srtxzvvjtuuiwledxxok.supabase.co/functions/v1/jarvis-web`

Chat history and generated study artifacts use Row Level Security policies so each signed-in user can access only their own rows.

## Verified status

- Database migrations are applied.
- Tables `study_sessions`, `study_artifacts`, and `user_preferences` have RLS enabled.
- A temporary probe confirmed the project's database event trigger enables RLS on new public tables; the probe table was dropped afterward.
- Supabase security advisors currently report no security lints.
- Edge Functions `jarvis-web`, `jarvis-chat`, and `jarvis-live-token` are deployed.
- Chat and Live endpoints require valid Supabase authentication (JWT verification enabled).
- The public preview endpoint serves only the frontend HTML and has no database-write behavior.
- JavaScript syntax validation and the latest GitHub Pages deployment succeeded.
- No AI provider secret is committed in the repository.

## Remaining setup

- Set `GEMINI_API_KEY` in Supabase Secrets before expecting real AI answers or live voice.
- Add the Authentication redirect URLs above before relying on email-confirmation redirects.
- Live voice needs HTTPS and browser microphone permission.
