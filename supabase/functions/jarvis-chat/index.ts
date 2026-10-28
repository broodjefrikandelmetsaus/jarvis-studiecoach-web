import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const allowedOrigins = new Set([
  "https://broodjefrikandelmetsaus.github.io",
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
  summary: "Maak een overzichtelijke Nederlandse samenvatting met kopjes, kernbegrippen, voorbeelden en wat echt geleerd moet worden. Maak onderscheid tussen belangrijke hoofdpunten en details.",
};
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
    const body = await req.json();
    const mode = typeof body.mode === "string" && modeInstructions[body.mode] ? body.mode : "tutor";
    const subject = typeof body.subject === "string" ? body.subject.slice(0, 160) : "";
    const material = typeof body.material === "string" ? body.material.slice(0, 12000) : "";
    const incoming = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    const contents = incoming.map((m: any) => {
      const text = typeof m.text === "string" ? m.text : typeof m.content === "string" ? m.content : "";
      return { role: m.role === "assistant" || m.role === "model" ? "model" : "user", parts: [{ text: text.slice(0, 5000) }] };
    }).filter((m: any) => m.parts[0].text.trim().length > 0);
    if (!contents.length) return new Response(JSON.stringify({ error: "Stuur eerst een vraag of bericht." }), { status: 400, headers });
    const systemText = [
      "Je bent AI Jarvis, een geduldige, motiverende Nederlandse persoonlijke studiecoach voor middelbare scholieren.",
      "Doel: de leerling stof laten begrijpen en zelfstandig laten oefenen, vooral voor toetsweken.",
      "Gebruik begrijpelijk Nederlands, pas uitleg aan het schoolniveau aan, geef concrete voorbeelden en vraag door als informatie ontbreekt.",
      "Detecteer automatisch het waarschijnlijke vak en onderwerp uit het gesprek. Als je niet zeker bent, vraag het kort in plaats van te gokken.",
      "Bij een vraag over de leerstof: leg stap voor stap uit en eindig waar nuttig met één korte controlevraag.",
      "Geef geen onbewezen claims over wat in het boek of de les staat. Gebruik de meegeleverde leerstof als bron als die aanwezig is.",
      "Veiligheid: vraag geen wachtwoorden, schoolinloggegevens of onnodige persoonsgegevens.",
      "Huidige modus: " + mode + ". " + modeInstructions[mode],
      "Vermoedelijk vak: " + (subject || "nog onbekend") + ".",
      material ? "Leerstof van de leerling (gebruik dit als context):\n" + material : "Er is nog geen aparte leerstof toegevoegd."
    ].join("\n\n");
    const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-3.8-flash";
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 1800 }
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = typeof result?.error?.message === "string" ? result.error.message.slice(0, 300) : "De Gemini-aanvraag is mislukt.";
      return new Response(JSON.stringify({ error: "Gemini gaf een fout: " + providerMessage }), { status: 502, headers });
    }
    const answer = (result?.candidates?.[0]?.content?.parts || []).map((p: any) => typeof p.text === "string" ? p.text : "").join("").trim();
    if (!answer) return new Response(JSON.stringify({ error: "Gemini gaf geen tekstantwoord terug. Probeer het opnieuw." }), { status: 502, headers });
    return new Response(JSON.stringify({ answer, model, mode, subject }), { status: 200, headers });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Ik kon je bericht niet verwerken. Controleer de invoer en probeer opnieuw." }), { status: 400, headers });
  }
});
