# AI Jarvis — persoonlijke studiecoach

AI Jarvis is een Nederlandstalige studiecoach die je in de browser kunt openen, ook op een school-Chromebook zonder app-installatie.

## Open de website

**Website:** https://broodjefrikandelmetsaus.github.io/jarvis-studiecoach-web/

**Directe preview:** https://srtxzvvjtuuiwledxxok.supabase.co/functions/v1/jarvis-web

GitHub Pages is ingeschakeld. Een recente GitHub Actions-run voltooide de controle van JavaScript, upload en publicatie succesvol.

## In de repository

- `index.html`: responsive studiecoach, e-mail login/registratie, vakherkenning, studie-modussen, tekstmateriaal, sessiegeschiedenis, realtime geschiedenisupdates en browser-spraakherkenning/voorlezen.
- `supabase/functions/jarvis-web/index.ts`: publieke, alleen-lezen HTML-preview.
- `supabase/functions/jarvis-chat/index.ts`: geauthenticeerde AI-chatfunctie voor een OpenAI-compatibele Chat Completions API.
- `supabase/functions/jarvis-live-token/index.ts`: tijdelijke compatibiliteitsfunctie. De browser gebruikt voorlopig Web Speech API in plaats van een apart live-audiomodel.
- `supabase/migrations/`: database- en beveiligingsmigraties die ook op het cloudproject zijn toegepast.

## Supabase

- Organisatie: `Ai Jarvis`
- Project: `Ai Jarvis Learning`
- Project-ref: `srtxzvvjtuuiwledxxok`
- Regio: `eu-west-1`
- Project-URL: https://srtxzvvjtuuiwledxxok.supabase.co

De tabellen `study_sessions`, `study_artifacts` en `user_preferences` hebben Row Level Security. Ingelogde gebruikers mogen alleen hun eigen gegevens lezen of wijzigen.

### AI-provider: bewust nog niet ingesteld

AI Jarvis wacht op een provider die geschikt is voor zowel de beheerder als minderjarige leerlingen. **Gebruik de Gemini API niet voor dit project**: de officiële Gemini API-voorwaarden bevatten een minimumleeftijd van 18 jaar en restricties voor diensten die op minderjarigen gericht zijn of waarschijnlijk door hen worden gebruikt. Zie https://ai.google.dev/gemini-api/terms.

Wanneer een geschikte provider en de account-/toestemmingsvereisten zijn bevestigd, voeg in Supabase Dashboard → **Edge Functions → Secrets** deze waarden toe:

- `AI_API_URL`: het volledige HTTPS-eindpunt van een OpenAI-compatibele Chat Completions API (inclusief `/chat/completions`).
- `AI_API_KEY`: de geheime sleutel van de gekozen provider.
- `AI_MODEL`: de exacte modelnaam die die API verwacht.

De sleutel wordt alleen server-side gebruikt en is niet opgeslagen in dit GitHub-project. Kies geen betaalde provider zonder prijs en gebruikslimieten eerst te controleren. Supabase Free betekent niet dat externe AI-aanroepen automatisch gratis zijn.

### Accounts en e-mailbevestiging

Gebruikers kunnen een account maken met e-mailadres en wachtwoord. Als e-mailbevestiging aanstaat, moet de bevestigingslink terug kunnen leiden naar Jarvis.

Open Supabase Dashboard → **Authentication → URL Configuration** en voeg toe:
- `https://broodjefrikandelmetsaus.github.io/jarvis-studiecoach-web/**`
- `https://srtxzvvjtuuiwledxxok.supabase.co/functions/v1/jarvis-web`

### Spraakmodus

Spraakmodus gebruikt de spraakherkenning en spraaksynthese van de browser en haalt daarna een antwoord op via de tekst-AI. Dit is een beurt-voor-beurt gesprek, geen volledig onderbreekbare telefoonachtige live-AI. Browser-spraakherkenning kan afhankelijk zijn van browserdiensten en microfoonrechten; behandel dit niet als gegarandeerd offline.

## Gecontroleerde status

- Supabase-project is actief in de organisatie `Ai Jarvis`.
- De drie eigen databasetabellen bestaan en RLS staat aan.
- De databasebeveiligingsadviezen gaven geen openstaande security-lints bij de laatste controle.
- De Edge Functions `jarvis-web`, `jarvis-chat` en `jarvis-live-token` zijn gepubliceerd.
- `jarvis-chat` en `jarvis-live-token` vereisen geldige Supabase-authenticatie.
- GitHub Actions heeft de publicatie van de website succesvol afgerond.
- Er is geen AI-provider-secret in de repository opgenomen.

## Nog nodig

1. Bevestig een AI-provider waarvan de voorwaarden onder-18 gebruik en beheer door een minderjarige toestaan; schakel zo nodig een ouder/voogd in.
2. Voeg daarna `AI_API_URL`, `AI_API_KEY` en `AI_MODEL` als Supabase Secrets toe.
3. Voeg de Authentication redirect-URL's hierboven toe en test aanmelden, e-mailbevestiging en opslaan.
