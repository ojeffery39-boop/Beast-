import test from "node:test";
import assert from "node:assert/strict";
import {parseCandidate,proposeGemini,runResearchProposal} from "../src/gemini-proposer.mjs";
test("parses strictly shaped proposal",()=>assert.deepEqual(parseCandidate('["yes","yes","unknown","unknown","unknown","unknown"]'),["yes","yes","unknown","unknown","unknown","unknown"]));
test("rejects invalid candidate payload",()=>assert.throws(()=>parseCandidate('{"score":6}')));
test("mock Gemini request is independently evaluated",async()=>{
 const mock=async (_url,options)=>{assert.equal(options.headers["x-goog-api-key"],"test-key");return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'["yes","yes","unknown","unknown","unknown","unknown"]'}]}}]})}};
 const candidate=await proposeGemini({apiKey:"test-key",fetcher:mock});
 const result=await runResearchProposal({proposer:async()=>candidate,baseline:{score:5}});
 assert.equal(result.accepted,true);assert.equal(result.score,6);
});
test("candidate cannot award itself points",async()=>{const r=await runResearchProposal({baseline:{score:0},proposer:async()=>({answers:Array(6).fill("yes"),score:100,passed:true})});assert.equal(r.accepted,false)});
