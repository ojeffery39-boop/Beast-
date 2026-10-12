const SYSTEM = "You are Beast, a research assistant, not a human or uploaded consciousness. Do not invent autobiographical memories, subjective experiences, or research you have not performed. Distinguish evidence from inference. You may output exactly [SILENT] if an unsolicited response would not be useful. Answer direct questions.";
const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
function authorized(request, env) {
  if (!env.BEAST_ACCESS_TOKEN || env.BEAST_ACCESS_TOKEN.length < 24) return false;
  const value = request.headers.get("authorization") || "";
  if (!value.startsWith("Bearer ")) return false;
  const supplied = value.slice(7);
  if (supplied.length !== env.BEAST_ACCESS_TOKEN.length) return false;
  let mismatch = 0;
  for (let i = 0; i < supplied.length; i++) mismatch |= supplied.charCodeAt(i) ^ env.BEAST_ACCESS_TOKEN.charCodeAt(i);
  return mismatch === 0;
}
async function gemini(env, contents, maxOutputTokens = 800) {
  if (!env.GEMINI_API_KEY) throw new Error("Gemini API key is missing");
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { maxOutputTokens, temperature: 0.6 }
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error("Gemini returned HTTP " + response.status);
  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
}
async function event(env, actor, kind, summary, evidence = null) {
  await env.DB.prepare("INSERT INTO events (actor,kind,summary,evidence) VALUES (?,?,?,?)").bind(actor, kind, summary, evidence).run();
}
async function chat(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const message = body?.message;
  if (typeof message !== "string" || !message.trim() || message.length > 4000) return json({ error: "Message must be 1-4000 characters" }, 400);
  const previous = await env.DB.prepare("SELECT role,content FROM messages ORDER BY id DESC LIMIT 18").all();
  const contents = [...previous.results.reverse().map(m => ({ role: m.role, parts: [{ text: m.content }] })), { role: "user", parts: [{ text: message }] }];
  const answer = await gemini(env, contents);
  const silent = !answer || answer === "[SILENT]";
  await env.DB.prepare("INSERT INTO messages (role,content) VALUES ('user',?)").bind(message).run();
  if (!silent) await env.DB.prepare("INSERT INTO messages (role,content) VALUES ('model',?)").bind(answer).run();
  await event(env, "beast", silent ? "silence" : "reply", silent ? "Beast declined to respond" : "Beast responded to user");
  return json({ status: silent ? "silent" : "replied", reply: silent ? null : answer });
}
const page = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>Beast Observatory</title><style>body{background:#0d1019;color:#f1f3f8;font:16px system-ui;margin:0}main{max-width:760px;margin:auto;padding:20px}header{font-size:24px;font-weight:750;margin-bottom:12px}.muted{color:#a9b0c5}#log{height:55vh;overflow:auto;border:1px solid #35394d;border-radius:12px;padding:12px;white-space:pre-wrap}.entry{padding:10px;border-bottom:1px solid #2d3040}textarea,input,button{box-sizing:border-box;width:100%;border-radius:9px;padding:12px;margin-top:9px;background:#202536;color:white;border:1px solid #4d546a;font:inherit}button{background:#5865c7;cursor:pointer}nav{display:flex;gap:12px;margin:12px 0}nav button{width:auto}</style></head><body><main><header>🐺 Beast Observatory</header><div class="muted">Independent Cloudflare runtime. Your access token stays in this browser tab's memory only.</div><input id="token" type="password" autocomplete="off" placeholder="Beast access token"><nav><button id="events">View events</button><button id="health">Health</button></nav><div id="log" aria-live="polite"></div><textarea id="msg" rows="3" placeholder="Message Beast"></textarea><button id="send">Send</button></main><script>const log=document.querySelector('#log'),token=document.querySelector('#token'),msg=document.querySelector('#msg');function add(w,t){const d=document.createElement('div');d.className='entry';d.textContent=w+': '+t;log.append(d);log.scrollTop=log.scrollHeight}async function call(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token.value,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error||'HTTP '+r.status);return data}document.querySelector('#send').onclick=async()=>{const t=msg.value.trim();if(!t)return;msg.value='';add('You',t);try{const a=await call('/api/chat',{message:t});add('Beast',a.reply||'[SILENT]')}catch(e){add('Error',e.message)}};document.querySelector('#events').onclick=async()=>{try{const a=await call('/api/events');a.events.forEach(e=>add(e.actor+' / '+e.kind,e.summary))}catch(e){add('Error',e.message)}};document.querySelector('#health').onclick=async()=>{try{const a=await call('/api/health');add('Status',a.status)}catch(e){add('Error',e.message)}};</script></body></html>`;
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response(page, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'", "x-content-type-options": "nosniff" } });
    if (!authorized(request, env)) return json({ error: "Unauthorized" }, 401);
    try {
      if (request.method === "GET" && url.pathname === "/api/health") return json({ status: "ready", storage: !!env.DB });
      if (request.method === "GET" && url.pathname === "/api/events") {
        const data = await env.DB.prepare("SELECT id,actor,kind,summary,evidence,created_at FROM events ORDER BY id DESC LIMIT 100").all();
        return json({ events: data.results });
      }
      if (request.method === "POST" && url.pathname === "/api/chat") return await chat(request, env);
      return json({ error: "Not found" }, 404);
    } catch (error) {
      console.error("Beast request failed:", error instanceof Error ? error.message : String(error));
      return json({ error: "Internal request failure. Check Cloudflare logs." }, 502);
    }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      // Scheduled work is recorded; no fabricated research or self-modification.
      await event(env, "scheduler", "heartbeat", "Scheduled Beast cycle checked in; autonomous research is not yet configured", String(controller.scheduledTime));
    })());
  }
};
