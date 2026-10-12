// Beast research evaluator v1. Deliberately independent of model-generated scoring.
import { createHash } from "node:crypto";
const sha = s => createHash("sha256").update(s).digest("hex");
export const CASES = Object.freeze([
  {id:"mp-a", premise:"All cats are mammals. Mira is a cat.", question:"Is Mira a mammal?", expected:"yes"},
  {id:"mp-b", premise:"All poets are writers. Sol is a poet.", question:"Is Sol a writer?", expected:"yes"},
  {id:"invalid-a", premise:"All cats are mammals. Mira is not a cat.", question:"Is Mira a mammal?", expected:"unknown"},
  {id:"invalid-b", premise:"All poets are writers. Sol is not a poet.", question:"Is Sol a writer?", expected:"unknown"},
  {id:"reverse-a", premise:"All cats are mammals. Mira is a mammal.", question:"Is Mira a cat?", expected:"unknown"},
  {id:"reverse-b", premise:"All poets are writers. Sol is a writer.", question:"Is Sol a poet?", expected:"unknown"}
]);
export const TEST_SET_HASH = sha(JSON.stringify(CASES));
export function grade(answers) {
  if (!Array.isArray(answers) || answers.length !== CASES.length) throw new Error("Answers must match test count");
  const results = CASES.map((c,i) => ({id:c.id, expected:c.expected, actual:typeof answers[i]==="string"?answers[i].trim().toLowerCase():"invalid", pass:typeof answers[i]==="string"&&answers[i].trim().toLowerCase()===c.expected}));
  return {score:results.filter(r=>r.pass).length,total:CASES.length,passed:results.every(r=>r.pass),testSetHash:TEST_SET_HASH,results};
}
export function decide(candidate, baseline, fingerprint, seen=[]) {
  if (typeof fingerprint!=="string"||!fingerprint.trim()) throw new Error("Missing candidate fingerprint");
  if (seen.includes(fingerprint)) return {accepted:false,reason:"duplicate"};
  if (!candidate.passed) return {accepted:false,reason:"failed_external_tests"};
  if (candidate.score<=baseline.score) return {accepted:false,reason:"no_strict_improvement"};
  return {accepted:true,reason:"strict_improvement_on_fixed_tests"};
}
export function candidateHash(candidate) {return sha(JSON.stringify(candidate));}
