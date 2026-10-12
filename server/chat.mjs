import { createServer } from "node:http";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
const port = Number(process.env.PORT || 3000);
const preferredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
let selectedModel = null;
let selectedAt = 0;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/";
async function resolveModel(key) {
  if (selectedModel && Date.now() - selectedAt < 3600000) return selectedModel;
  const response = await fetch(GEMINI_BASE + "models?pageSize=100", {headers: {"x-goog-api-key":key}, signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error("Gemini model discovery failed (" + response.status + ")");
  const data = await response.json();
  const supported = (data.models || []).filter(m => m.supportedGenerationMethods?.includes("generateContent")).map(m => m.name?.replace(/^models\//,"")).filter(Boolean);
  if (!supported.length) throw new Error("No generateContent models available for this API key");
  const choices = ["gemini-3.8-flash", preferredModel, "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite"];
  selectedModel = choices.find(m => supported.includes(m)) || supported.find(m => /gemini-3.*flash/i.test(m)) || supported.find(m => /flash/i.test(m)) || supported[0];
  selectedAt = Date.now();
  console.log("Gemini model selected:", selectedModel);
  return selectedModel;
}
const html = new URL("../web/chat.html", import.meta.url);
const dataFile = process.env.BEAST_DATA_FILE || "/tmp/beast-history.json";
const history = new Map();
const accessToken = process.env.BEAST_ACCESS_TOKEN;
function authenticated(req) {
  if (!accessToken) return false;
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  let credentials;
  try { credentials = Buffer.from(header.slice(6), "base64").toString("utf8"); } catch { return false; }
  const provided = Buffer.from(credentials.slice(credentials.indexOf(":") + 1));
  const expected = Buffer.from(accessToken);
  return credentials.includes(":") && provided.length === expected.length && timingSafeEqual(provided, expected);
}
async function loadHistory() {
  try {
    const stored = JSON.parse(await readFile(dataFile, "utf8"));
    if (Array.isArray(stored) && stored.length <= 20) history.set("local", stored);
  } catch (error) { if (error.code !== "ENOENT") console.error("Unable to load history:", error.message); }
}
async function saveHistory(messages) {
  const tmp = dataFile + ".tmp";
  await mkdir(new URL(".", "file://" + dataFile).pathname, {recursive:true});
  await writeFile(tmp, JSON.stringify(messages), {mode:0o600});
  await rename(tmp, dataFile);
}
await loadHistory();
const MAX_BODY = 16000;
const send = (res, status, body) => { res.writeHead(status, {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}); res.end(JSON.stringify(body)); };
function validMessage(value) { return typeof value === "string" && value.trim().length > 0 && value.length <= 4000; }
const SYSTEM_PROMPT = "You are Beast, an AI research assistant. You are not a human or an uploaded consciousness. Never invent autobiographical memories, subjective experiences, or private thoughts. Be factual, candid and concise. You may reply with exactly [SILENT] when no response would be useful, but answer direct user questions unless unsafe.";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function openModelFallback(contents) {
  // Configure BEAST_FALLBACK_URL with a trusted HTTPS OpenAI-compatible chat completions endpoint.
  // Never send chat history to an untrusted server. A local endpoint requires a private network.
  const endpoint = process.env.BEAST_FALLBACK_URL;
  const model = process.env.BEAST_FALLBACK_MODEL;
  if (!endpoint || !model) return null;
  const url = new URL(endpoint);
  if (url.protocol !== "https:" && !(url.hostname === "127.0.0.1" || url.hostname === "localhost")) throw new Error("Fallback endpoint must use HTTPS");
  const messages = [{role:"system",content:SYSTEM_PROMPT},...contents.map(c => ({role:c.role === "model" ? "assistant" : "user",content:(c.parts||[]).map(p=>p.text||"").join("")}))];
  const response = await fetch(url, {method:"POST",signal:AbortSignal.timeout(30000),headers:{"content-type":"application/json",...(process.env.BEAST_FALLBACK_API_KEY ? {authorization:"Bearer "+process.env.BEAST_FALLBACK_API_KEY} : {})},body:JSON.stringify({model,messages,max_tokens:800,temperature:0.7})});
  if (!response.ok) throw new Error("Fallback model failed ("+response.status+")");
  const data = await response.json();
  const result = data.choices?.[0]?.message?.content;
  if (typeof result !== "string" || !result.trim()) throw new Error("Fallback model returned no text");
  console.log("Beast reply served by configured fallback model");
  return result.trim();
}
async function reply(text, prior) {
  const contents = [...prior, {role:"user",parts:[{text}]}];
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const fallback = await openModelFallback(contents);
    if (fallback !== null) return fallback;
    throw new Error("No AI provider configured");
  }
  let lastError;
  for (let attempt=0;attempt<3;attempt++) {
    try {
      const model = await resolveModel(key);
      const response = await fetch(GEMINI_BASE+"models/"+encodeURIComponent(model)+":generateContent",{
        method:"POST",signal:AbortSignal.timeout(25000),
        headers:{"content-type":"application/json","x-goog-api-key":key},
        body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM_PROMPT}]},contents,generationConfig:{maxOutputTokens:800,temperature:0.7}})
      });
      if (response.ok) {
        const data=await response.json();
        return (data.candidates?.[0]?.content?.parts??[]).map(p=>p.text||"").join("").trim();
      }
      let detail="";
      try {const err=await response.json();detail=String(err?.error?.message||"").slice(0,350);}catch{}
      console.error("Gemini API failure",JSON.stringify({status:response.status,model,attempt:attempt+1,detail}));
      if (response.status===404) {selectedModel=null;selectedAt=0;}
      lastError=new Error("Gemini request failed ("+response.status+")");
      if (![429,500,502,503,504].includes(response.status)) break;
      if (attempt<2) {
        const retryAfter=Number(response.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter)&&retryAfter>0 ? Math.min(retryAfter*1000,5000) : 800*(attempt+1));
      }
    } catch(error) {
      lastError=error;
      console.error("Gemini transport failure",error instanceof Error ? error.message : "Unknown error");
      if (attempt<2) await sleep(800*(attempt+1));
    }
  }
  try {
    const fallback=await openModelFallback(contents);
    if (fallback!==null) return fallback;
  } catch(error) {
    console.error("Configured fallback failed",error instanceof Error ? error.message : "Unknown error");
  }
  throw lastError||new Error("All AI providers unavailable");
}

if (!accessToken || accessToken.length < 24) throw new Error("BEAST_ACCESS_TOKEN must be set to a random secret of at least 24 characters");
createServer(async (req, res) => {
  if (!authenticated(req)) {
    res.writeHead(401, {"www-authenticate":'Basic realm="Beast Sandbox"',"cache-control":"no-store"});
    res.end("Authentication required"); return;
  }
  if (req.method === "GET" && req.url === "/health") { send(res, 200, {status:"ready"}); return; }
  if (req.method === "GET" && (req.url === "/" || req.url === "/chat")) {
    res.writeHead(200, {"content-type":"text/html; charset=utf-8","cache-control":"no-store"});
    try { res.end(await readFile(html)); } catch { res.end("Chat UI unavailable"); } return;
  }
  // Authenticated, read-only connectivity check. No chat history is read or written.
  if (req.method === "POST" && req.url === "/api/diagnostics/gemini") {
    if (!process.env.GEMINI_API_KEY) { send(res, 503, {status:"error", error:"GEMINI_API_KEY is not configured"}); return; }
    try {
      const result = await reply("Reply with the single word READY.", []);
      send(res, 200, {status:"connected", model:selectedModel, responded: Boolean(result), reply:result.slice(0, 80)});
    } catch (error) {
      send(res, 502, {status:"error", model:selectedModel, error:error instanceof Error ? error.message : "Gemini check failed"});
    }
    return;
  }
  if (req.method !== "POST" || req.url !== "/api/chat") { send(res, 404, {error:"Not found"}); return; }
  // Single-user sandbox with Basic authentication; require TLS at any remote reverse proxy.
  let body = "";
  try {
    for await (const chunk of req) { body += chunk; if (body.length > MAX_BODY) { send(res, 413, {error:"Message too large"}); return; } }
    const input = JSON.parse(body);
    if (!validMessage(input.message)) { send(res, 400, {error:"Message must be 1–4000 characters"}); return; }
    const id = "local";
    const prior = history.get(id) || [];
    const answer = await reply(input.message, prior);
    const silent = answer === "[SILENT]" || !answer;
    const next = [...prior, {role:"user",parts:[{text:input.message}]}];
    if (!silent) next.push({role:"model",parts:[{text:answer}]});
    const updated = next.slice(-20);
    await saveHistory(updated);
    history.set(id, updated);
    send(res, 200, {status:silent?"silent":"replied", reply:silent?null:answer});
  } catch (error) { send(res, 502, {error:error instanceof Error ? error.message : "Request failed"}); }
}).listen(port, process.env.HOST || "127.0.0.1", () => console.log("Beast chat listening on configured interface, port " + port));
