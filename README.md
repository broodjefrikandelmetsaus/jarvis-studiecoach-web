# AI Jarvis — studiecoach

Browser-based Dutch AI study coach for school Chromebooks (no installation).

## Current status
This repository contains the first frontend scaffold: responsive dashboard, study-mode shortcuts, local session history, text-material input, and a browser speech-recognition prototype. It clearly indicates that authentication and AI are not connected yet.

## Planned integrations
- Supabase Auth + database + Row Level Security for private user history and progress.
- Supabase Edge Function as a secure server-side boundary for the AI provider. Never place an AI API key in browser JavaScript or commit it to Git.
- Live speech conversation, with a text fallback for browsers/devices that do not support it.
- Generated quizzes, flashcards, practice exams, and summaries based on the user's subject/material.
- GitHub Pages for hosting the static frontend.

## Deploy locally
Open `index.html` in a browser. For GitHub Pages, enable Pages for the `main` branch and root folder in repository settings.

## Important
This is not yet a working AI tutor. Supabase project creation and safe AI backend configuration must complete before login, cloud saving, and real AI responses work. Current local history is stored only in that browser's localStorage and can disappear if browser data is cleared.
