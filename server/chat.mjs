import { createServer } from "node:http";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
const port = Number(process.env.PORT || 3000);
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const html = new URL("../web/chat.html", import.meta.url);
const dataFile = process.env.BEAST_DATA_FILE || "/data/history.json";
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
async function reply(text, prior) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured on the server");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const contents = [...prior, { role: "user", parts: [{ text }] }];
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: "You are Beast, an AI research assistant. You are not a human or an uploaded consciousness. Never invent autobiographical memories, subjective experiences, or private thoughts. Be factual, candid and concise. You may reply with exactly [SILENT] when no response would be useful, but answer direct user questions unless unsafe." }] }, contents, generationConfig: { maxOutputTokens: 800, temperature: 0.7 } })
    });
    if (!response.ok) throw new Error("Gemini request failed (" + response.status + ")");
    const data = await response.json();
    return (data.candidates?.[0]?.content?.parts ?? []).map(p => p.text || "").join("").trim();
  } finally { clearTimeout(timeout); }
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
