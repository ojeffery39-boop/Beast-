// Gemini proposes candidate answers. The external evaluator alone judges them.
// This module has no deployment, file-write, or code-execution capability.
import {CASES} from "./research-evaluator.mjs";
import {evaluateCycle} from "./research-cycle.mjs";
const SYSTEM = "You are a research candidate. Answer each logical entailment question using only its premises. Return ONLY a JSON array of exactly six strings, each either yes, no, or unknown, in the given order. Unknown means the premises do not entail either answer. Do not explain.";
export function parseCandidate(text) {
  if(typeof text!=="string"||text.length>3000) throw new Error("Invalid Gemini output");
  const value=JSON.parse(text.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,"").replace(/\s*\x60\x60\x60$/,""));
  if(!Array.isArray(value)||value.length!==CASES.length||!value.every(x=>typeof x==="string"&&["yes","no","unknown"].includes(x.trim().toLowerCase()))) throw new Error("Malformed candidate answers");
  return value.map(x=>x.trim().toLowerCase());
}
export async function proposeGemini({apiKey=process.env.GEMINI_API_KEY,model=process.env.GEMINI_MODEL||"gemini-2.5-flash",fetcher=fetch}={}) {
  if(!apiKey) throw new Error("GEMINI_API_KEY missing");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try {
    const response=await fetcher("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent",{
      method:"POST",signal:controller.signal,
      headers:{"content-type":"application/json","x-goog-api-key":apiKey},
      body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents:[{role:"user",parts:[{text:CASES.map((c,i)=>`${i+1}. ${c.premise} ${c.question}`).join("\n")}]}],generationConfig:{temperature:0,maxOutputTokens:180,responseMimeType:"application/json"}})
    });
    if(!response.ok) throw new Error("Gemini candidate request failed ("+response.status+")");
    const data=await response.json();
    return {answers:parseCandidate((data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||"").join(""))};
  } finally {clearTimeout(timeout)}
}
export async function runResearchProposal({baseline={score:0},seen=[],proposer=proposeGemini}={}) {
  const candidate=await proposer();
  return evaluateCycle({candidate,baseline,seen});
}
