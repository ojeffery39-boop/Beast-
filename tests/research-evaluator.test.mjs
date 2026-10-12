import test from "node:test";
import assert from "node:assert/strict";
import {CASES,grade,decide,candidateHash,TEST_SET_HASH} from "../src/research-evaluator.mjs";
test("fixed evaluator rejects invalid inference",()=>{const a=grade(["yes","yes","unknown","unknown","unknown","unknown"]);assert.equal(a.passed,true);assert.equal(a.score,6);assert.equal(a.testSetHash,TEST_SET_HASH)});
test("invalid and reversed inferences fail",()=>assert.equal(grade(Array(6).fill("yes")).passed,false));
test("duplicates and regressions cannot pass",()=>{const good=grade(CASES.map(x=>x.expected));assert.equal(decide(good,{score:5},"x",["x"]).reason,"duplicate");assert.equal(decide(good,{score:6},"y").accepted,false);assert.equal(decide(good,{score:5},"z").accepted,true)});
test("fingerprints are stable",()=>assert.equal(candidateHash({a:1}),candidateHash({a:1})));
