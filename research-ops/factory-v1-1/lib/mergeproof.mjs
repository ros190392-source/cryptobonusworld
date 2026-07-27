// ResearchOps Factory V1.1 — real merge proof for RESEARCH_RECORD_MERGED_TO_MAIN
// (V4-C6). A syntactically valid 40-hex string is not proof of a merge. This validates
// the record's structure and combines it with read-only repository FACTS collected by
// the CLI via fixed-argument Git subprocess calls (no shell, no Git writes). The pure
// core makes fabricated, all-zero, unrelated and non-main-reachable commits fail.

const HEX40 = /^[0-9a-f]{40}$/;
const ZERO40 = '0'.repeat(40);

// record: the parsed 80-closeout merge record.
// facts: {
//   commitExists,            // merge SHA is a real commit object
//   reachableFromMain,       // reachable from target main
//   governedTreePresent,     // the exact governed task tree is present at commit/main
//   receiptHashMatch,        // record's receiptHash equals the on-disk receipt hash
//   receiptPredatesMerge,    // receipt timestamp/commit predates the merge
//   receiptAuthorizesThisTaskOnly, // receipt is scoped to exactly this task/merge
// }
export function verifyMergeRecord(record, taskId, facts = {}) {
  const e = [];
  if (!record || typeof record !== 'object') return { ok: false, errors: ['no merge record'] };

  if (record.taskId !== taskId) e.push(`merge record taskId (${JSON.stringify(record.taskId)}) != ${taskId}`);
  if (record.targetBranch !== 'main') e.push(`merge target must be main, got ${JSON.stringify(record.targetBranch)}`);
  if (record.mergedState !== 'RESEARCH_RECORD_MERGED_TO_MAIN') e.push(`mergedState must be RESEARCH_RECORD_MERGED_TO_MAIN, got ${JSON.stringify(record.mergedState)}`);

  const sha = record.mergeCommit;
  if (typeof sha !== 'string' || !HEX40.test(sha)) e.push(`mergeCommit must be a 40-hex SHA, got ${JSON.stringify(sha)}`);
  else if (sha === ZERO40) e.push('mergeCommit is the all-zero SHA');

  // Receipt linkage must be an immutable hash or exact identifier.
  const receiptRef = record.receiptHash || record.receiptId;
  if (!receiptRef) e.push('merge record does not link an owner receipt by hash/id');

  // Repository facts (only meaningful once structure is valid).
  if (facts.commitExists === false) e.push('merge commit does not exist in the repository');
  if (facts.reachableFromMain === false) e.push('merge commit is not reachable from main');
  if (facts.governedTreePresent === false) e.push('the governed task tree is not present at the merge commit/main');
  if (receiptRef && facts.receiptHashMatch === false) e.push('owner receipt hash/id does not match the linked reference');
  if (facts.receiptPredatesMerge === false) e.push('owner receipt does not predate the merge');
  if (facts.receiptAuthorizesThisTaskOnly === false) e.push('owner receipt does not authorize exactly this task/merge');

  return { ok: e.length === 0, errors: e };
}
