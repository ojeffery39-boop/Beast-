const BASE = "https://generativelanguage.googleapis.com/v1beta/";
const TRANSIENT = new Set([429,500,502,503,504]);
const health = new Map();
let cache = {at:0, models:[]};
const TIMEOUT = 9500;
const COOLDOWN = 60000;
const system = "You are Beast, an AI research assistant. You are not a human or an uploaded consciousness. Never invent autobiographical memories, subjective experiences, or private thoughts. Be factual, candid and concise. You may reply with exactly [SILENT] when no response would be useful, but answer direct user questions unless unsafe.";
export async function discover(key, fetcher=fetch) {
  if (cache.models.length && Date.now()-cache.at<300000) return cache.models;
  const res=await fetcher(BASE+"models?pageSize=100",{headers:{"x-goog-api-key":key},signal:AbortSignal.timeout(9500)});
  if(!res.ok) throw Error("Model discovery failed ("+res.status+")");
  const data=await res.json();
  const models=(data.models||[]).filter(m=>m.supportedGenerationMethods?.includes("generateContent")).map(m=>m.name?.replace(/^models\//,"")).filter(m=>/^gemini-[a-z0-9.\-]+$/i.test(m));
  if(!models.length) throw Error("No compatible Gemini models discovered");
  cache={at:Date.now(),models:[...new Set(models)]};
  return cache.models;
}
export async function generate({key,contents,preferred=process.env.GEMINI_MODEL,fetcher=fetch}) {
  const models=await discover(key,fetcher);
  const priority=[preferred,"gemini-3.8-flash","gemini-2.5-flash-lite","gemini-2.5-flash","gemini-2.0-flash-lite"].filter(Boolean);
  const ranked=[...models].sort((a,b)=>{const ai=priority.indexOf(a),bi=priority.indexOf(b);return (ai<0?999:ai)-(bi<0?999:bi);});
  const available=ranked.filter(m=>(health.get(m)||0)<=Date.now());
  const candidates=(available.length?available:ranked).slice(0,2);
  const requestId=crypto.randomUUID();
  let last="unavailable";
  for(const [i,model] of candidates.entries()) {
    try {
      const response=await fetcher(BASE+"models/"+encodeURIComponent(model)+":generateContent",{
        method:"POST",signal:AbortSignal.timeout(TIMEOUT),headers:{"content-type":"application/json","x-goog-api-key":key},
        body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{maxOutputTokens:1600,temperature:0.7}})
      });
      if(response.ok){
        const data=await response.json();
        const candidate=data.candidates?.[0];
        const answer=(candidate?.content?.parts||[]).map(p=>p.text||"").join("").trim();
        if(!answer) throw Error("Empty provider response");
        console.log("Gemini response",JSON.stringify({requestId,model,status:"ok"}));
        return {answer,model,requestId};
      }
      last="HTTP "+response.status;
      console.warn("Gemini provider failure",JSON.stringify({requestId,model,status:response.status}));
      if(!TRANSIENT.has(response.status)) break;
      health.set(model,Date.now()+COOLDOWN);
    }catch(error){
      last=error?.name==="TimeoutError"?"timeout":"transport or malformed response";
      console.warn("Gemini provider failure",JSON.stringify({requestId,model,kind:last}));
      health.set(model,Date.now()+COOLDOWN);
    }
    if(i===0&&candidates.length>1) await new Promise(r=>setTimeout(r,250));
  }
  throw Error("Gemini unavailable ("+last+"); request "+requestId);
}
