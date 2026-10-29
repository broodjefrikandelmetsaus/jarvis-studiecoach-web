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
  // Independent provider first, NVIDIA retained as fallback. Credentials stay in Supabase Secrets.
  type Provider = { name: string; url: string; key: string; model: string };
  const providers: Provider[] = [];
  const cloudflareToken = Deno.env.get("CLOUDFLARE_AI_TOKEN") || "";
  const cloudflareAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "";
  const nvidiaKey = Deno.env.get("NVIDIA_API_KEY") || "";
  const genericKey = Deno.env.get("AI_API_KEY") || "";
  const genericUrl = Deno.env.get("AI_API_URL") || "";
  const genericModel = Deno.env.get("AI_MODEL") || "";

  if (cloudflareToken && /^[a-f0-9]{32}$/i.test(cloudflareAccountId)) {
    providers.push({
      name: "Cloudflare Workers AI",
      url: `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/v1/chat/completions`,
      key: cloudflareToken,
      model: "@cf/zai-org/glm-4.7-flash"
    });
  }
  if (genericKey && genericUrl && genericModel) {
    try {
      const genericEndpoint = new URL(genericUrl);
      if (genericEndpoint.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(genericEndpoint.hostname)
        && !providers.some(p => p.url === genericEndpoint.toString())
        && genericEndpoint.hostname !== "integrate.api.nvidia.com") {
        providers.push({ name: "Configured AI provider", url: genericEndpoint.toString(), key: genericKey, model: genericModel });
      }
    } catch { /* Ignore invalid optional provider configuration and continue with available providers. */ }
  }
  if (nvidiaKey) {
    providers.push({
      name: "NVIDIA",
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      key: nvidiaKey,
      model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
    });
  }
  if (!providers.length) {
    return new Response(JSON.stringify({
      error: "Jarvis heeft geen AI-provider ingesteld. Stel CLOUDFLARE_AI_TOKEN en CLOUDFLARE_ACCOUNT_ID in Supabase Secrets in (aanbevolen), of controleer NVIDIA_API_KEY."
    }), { status: 503, headers });
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
    const messages = [{ role: "system", content: systemText }, ...conversation];
    let successfulResponse: Response | null = null;
    let successfulProvider: Provider | null = null;
    let lastStatus = 503;
    for (const provider of providers) {
      let providerSucceeded = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        let upstream: Response;
        try {
          upstream = await fetch(provider.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + provider.key },
            body: JSON.stringify({
              model: provider.model,
              messages,
              temperature: 0.6,
              max_tokens: 1400,
              stream: false
            }),
            signal: AbortSignal.timeout(25000)
          });
        } catch (fetchError) {
          const timeout = fetchError instanceof DOMException &&
            (fetchError.name === "TimeoutError" || fetchError.name === "AbortError");
          lastStatus = timeout ? 504 : 502;
          console.error("AI provider network failure", { provider: provider.name, timeout });
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 700));
            continue;
          }
          break;
        }
        if (upstream.ok) {
          successfulResponse = upstream;
          successfulProvider = provider;
          providerSucceeded = true;
          break;
        }
        lastStatus = upstream.status;
        let rawError = "";
        try { rawError = (await upstream.text()).slice(0, 1200); } catch {}
        let parsedError: any = null;
        try { parsedError = JSON.parse(rawError); } catch {}
        const detail = typeof parsedError?.error === "string"
          ? parsedError.error
          : typeof parsedError?.error?.message === "string"
          ? parsedError.error.message
          : typeof parsedError?.message === "string"
          ? parsedError.message
          : typeof parsedError?.errors?.[0]?.message === "string"
          ? parsedError.errors[0].message
          : rawError.replace(/[\\r\\n\\t]+/g, " ").slice(0, 180);
        console.error("AI provider failure", { provider: provider.name, status: upstream.status, detail: detail.slice(0, 180) });
        if ([408, 429, 500, 502, 503, 504].includes(upstream.status) && attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 900));
          continue;
        }
        break;
      }
      if (providerSucceeded) break;
      // Try the next configured provider after a failure.
    }
    if (!successfulResponse || !successfulProvider) {
      const publicError = lastStatus === 429 || lastStatus === 503
        ? "De AI-diensten zijn tijdelijk overbelast. Jarvis heeft de beschikbare providers geprobeerd. Probeer het over een minuut opnieuw."
        : lastStatus === 504
        ? "De AI-diensten reageerden te langzaam. Jarvis heeft de beschikbare providers geprobeerd. Probeer het opnieuw met een kortere vraag."
        : "Jarvis kon geen antwoord ophalen bij de beschikbare AI-providers. Controleer de providerinstellingen in Supabase.";
      return new Response(JSON.stringify({ error: publicError }), { status: 502, headers });
    }
    const response = successfulResponse;
    const model = successfulProvider.model;
    console.info("AI response succeeded", { provider: successfulProvider.name, model });
    const result = await response.json().catch(() => ({}));
    const raw = result?.choices?.[0]?.message?.content;
    const answer = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? raw.map((p: any) => typeof p?.text === "string" ? p.text : "").join("").trim() : "";
    if (!answer) return new Response(JSON.stringify({ error: "De AI-provider gaf geen tekstantwoord terug. Controleer of het model Chat Completions ondersteunt." }), { status: 502, headers });
    return new Response(JSON.stringify({ answer, model, provider: successfulProvider?.name || "AI", mode, subject }), { status: 200, headers });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Ik kon je bericht niet verwerken. Controleer de invoer en probeer opnieuw." }), { status: 400, headers });
  }
});
