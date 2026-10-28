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
const modeInstructions: Record<string, string> = {
  tutor: "Geef persoonlijke uitleg in kleine stappen. Stel controlevragen, controleer misverstanden en pas de uitleg aan aan het niveau van een mavo-leerling. Geef niet alleen het antwoord: help de leerling het zelf te begrijpen.",
  quiz: "Maak een interactieve quiz in het Nederlands. Stel bij voorkeur één vraag tegelijk, wacht op het antwoord en geef daarna feedback met uitleg. Begin met een korte vraag over vak en onderwerp als die ontbreken.",
  cards: "Help flashcards te maken. Geef de belangrijkste begrippen met korte vragen en antwoorden en gebruik actief ophalen (active recall). Wanneer passend, formatteer meerdere kaarten duidelijk als Vraag — Antwoord.",
  exam: "Maak een realistische oefentoets op basis van opgegeven stof. Mix vraagtypen, geef niet meteen alle antwoorden. Vraag eerst naar vak/onderwerp/niveau als dat ontbreekt. Geef na afloop een nakijkmodel met uitleg.",
  summary: "Maak een overzichtelijke Nederlandse samenvatting met kopjes, kernbegrippen, voorbeelden en wat echt geleerd moet worden. Maak onderscheid tussen belangrijke hoofdpunten en details."
};
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (!origin || !allowedOrigins.has(origin)) return new Response(JSON.stringify({ error: "Origin niet toegestaan." }), { status: 403, headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Gebruik POST." }), { status: 405, headers });
  if (!req.headers.get("Authorization")?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Log eerst in." }), { status: 401, headers });
  const apiKey = Deno.env.get("AI_API_KEY");
  const apiUrl = Deno.env.get("AI_API_URL");
  const model = Deno.env.get("AI_MODEL");
  if (!apiKey || !apiUrl || !model) {
    return new Response(JSON.stringify({ error: "De AI-provider is nog niet ingesteld. AI Jarvis wacht op een provider waarvan de voorwaarden geschikt zijn voor de beheerder én minderjarige leerlingen. Voeg pas daarna AI_API_URL, AI_API_KEY en AI_MODEL toe aan Supabase Secrets." }), { status: 503, headers });
  }
  let endpoint: URL;
  try {
    endpoint = new URL(apiUrl);
    if (endpoint.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(endpoint.hostname)) throw new Error("Only an HTTPS API endpoint is allowed.");
  } catch {
    return new Response(JSON.stringify({ error: "AI_API_URL moet een geldig HTTPS-eindpunt voor een OpenAI-compatibele Chat Completions API zijn." }), { status: 503, headers });
  }
  try {
    const body = await req.json();
    const mode = typeof body.mode === "string" && modeInstructions[body.mode] ? body.mode : "tutor";
    const subject = typeof body.subject === "string" ? body.subject.slice(0, 160) : "";
    const material = typeof body.material === "string" ? body.material.slice(0, 12000) : "";
    const incoming = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    const conversation = incoming.map((m: any) => {
      const content = typeof m.text === "string" ? m.text : typeof m.content === "string" ? m.content : "";
      return { role: m.role === "assistant" || m.role === "model" ? "assistant" : "user", content: content.slice(0, 5000) };
    }).filter((m: any) => m.content.trim().length > 0);
    if (!conversation.length) return new Response(JSON.stringify({ error: "Stuur eerst een vraag of bericht." }), { status: 400, headers });
    const systemText = [
      "Je bent AI Jarvis, een geduldige, motiverende Nederlandse persoonlijke studiecoach voor middelbare scholieren.",
      "Doel: de leerling stof laten begrijpen en zelfstandig laten oefenen, vooral voor toetsweken.",
      "Gebruik begrijpelijk Nederlands, pas uitleg aan het schoolniveau aan, geef concrete voorbeelden en vraag door als informatie ontbreekt.",
      "Detecteer automatisch het waarschijnlijke vak en onderwerp uit het gesprek. Als je niet zeker bent, vraag het kort in plaats van te gokken.",
      "Bij een vraag over de leerstof: leg stap voor stap uit en eindig waar nuttig met één korte controlevraag.",
      "Geef geen onbewezen claims over wat in het boek of de les staat. Gebruik de meegeleverde leerstof als bron als die aanwezig is.",
      "Vraag nooit om wachtwoorden, schoolinloggegevens of onnodige persoonsgegevens.",
      "Huidige modus: " + mode + ". " + modeInstructions[mode],
      "Vermoedelijk vak: " + (subject || "nog onbekend") + ".",
      material ? "Leerstof van de leerling (gebruik dit als context):\n" + material : "Er is nog geen aparte leerstof toegevoegd."
    ].join("\n\n");
    const response = await fetch(endpoint.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemText }, ...conversation],
        temperature: 0.6,
        max_tokens: 1800,
        stream: false
      })
    });
    if (!response.ok) {
      const providerStatus = response.status;
      let code = "";
      try { const err = await response.json(); code = typeof err?.error?.code === "string" ? err.error.code : ""; } catch {}
      return new Response(JSON.stringify({ error: "De ingestelde AI-provider gaf HTTP " + providerStatus + (code ? " (" + code.slice(0, 80) + ")" : "") + ". Controleer provider, model en tegoed." }), { status: 502, headers });
    }
    const result = await response.json().catch(() => ({}));
    const raw = result?.choices?.[0]?.message?.content;
    const answer = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? raw.map((p: any) => typeof p?.text === "string" ? p.text : "").join("").trim() : "";
    if (!answer) return new Response(JSON.stringify({ error: "De AI-provider gaf geen tekstantwoord terug. Controleer of het model Chat Completions ondersteunt." }), { status: 502, headers });
    return new Response(JSON.stringify({ answer, model, mode, subject }), { status: 200, headers });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Ik kon je bericht niet verwerken. Controleer de invoer en probeer opnieuw." }), { status: 400, headers });
  }
});
