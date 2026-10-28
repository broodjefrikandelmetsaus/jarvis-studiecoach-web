import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const allowedOrigins = new Set([
  "https://broodjefrikandelmetsaus.github.io",
  "https://srtxzvvjtuuiwledxxok.supabase.co",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);
function corsHeaders(origin: string | null) {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : "https://broodjefrikandelmetsaus.github.io";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8"
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (!origin || !allowedOrigins.has(origin)) return new Response(JSON.stringify({ error: "Origin niet toegestaan." }), { status: 403, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Gebruik POST." }), { status: 405, headers });
  if (!req.headers.get("Authorization")?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Log eerst in." }), { status: 401, headers });
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "Gemini is nog niet gekoppeld. Voeg GEMINI_API_KEY toe bij Supabase → Edge Functions → Secrets." }), { status: 503, headers });
  try {
    const now = Date.now();
    const systemText = [
      "Je bent AI Jarvis, een Nederlandse studiecoach voor middelbare scholieren.",
      "Praat natuurlijk, helder en bemoedigend. Hou gesproken antwoorden meestal kort, leg moeilijke concepten stap voor stap uit en stel één controlevraag wanneer dat helpt.",
      "Detecteer vak en onderwerp automatisch als dat kan; vraag kort door als het onduidelijk is.",
      "Help met leren voor toetsweken, maar verzin geen details over het lesmateriaal dat niet is aangeleverd.",
      "Vraag nooit om wachtwoorden of onnodige persoonlijke gegevens."
    ].join("\n");
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        uses: 1,
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: "models/gemini-3.8-live",
          config: {
            responseModalities: ["AUDIO"],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            sessionResumption: {},
            systemInstruction: { parts: [{ text: systemText }] }
          }
        }
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.name !== "string") {
      const message = typeof result?.error?.message === "string" ? result.error.message.slice(0, 250) : "Ephemeral Live-token kon niet worden aangemaakt.";
      return new Response(JSON.stringify({ error: message }), { status: 502, headers });
    }
    return new Response(JSON.stringify({ token: result.name, model: "gemini-3.8-live", expiresInSeconds: 1800 }), { status: 200, headers });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "De live-spraakverbinding kon niet worden voorbereid." }), { status: 502, headers });
  }
});
