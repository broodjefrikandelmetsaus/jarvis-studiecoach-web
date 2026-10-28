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
  return new Response(JSON.stringify({
    error: "Een apart live-token is niet nodig: AI Jarvis gebruikt browser-spraakherkenning voor je stem en spreekt het antwoord van de tekst-AI terug. Configureer eerst een geschikte AI-provider via AI_API_URL, AI_API_KEY en AI_MODEL."
  }), { status: 501, headers });
});
