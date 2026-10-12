// Offline experiment recorder. Never calls Gemini or modifies production code.
import {candidateHash, decide, grade, TEST_SET_HASH} from "./research-evaluator.mjs";
export function evaluateCycle({candidate,baseline,seen=[]}) {
  if (!candidate || typeof candidate!=="object" || Array.isArray(candidate)) throw new Error("Invalid candidate");
  if (!Array.isArray(candidate.answers)) throw new Error("Candidate must contain answers");
  const fingerprint=candidateHash(candidate);
  const graded=grade(candidate.answers);
  const decision=decide(graded,baseline,fingerprint,seen);
  return Object.freeze({schemaVersion:1,fingerprint,testSetHash:TEST_SET_HASH,score:graded.score,total:graded.total,accepted:decision.accepted,reason:decision.reason,results:graded.results});
}
