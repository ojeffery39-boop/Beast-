// One explicitly invoked experiment cycle. No scheduler, no self-deployment.
import {openArchive} from "./research-archive.mjs";
import {runResearchProposal} from "./gemini-proposer.mjs";
export async function runArchivedCycle({archive=openArchive(),proposer}={}) {
  try {
    await archive.init();
    const baseline=await archive.baseline();
    const seen=await archive.seen();
    const result=await runResearchProposal({baseline,seen,proposer});
    const stored=await archive.record(result);
    return {result,stored};
  } finally {await archive.close()}
}
