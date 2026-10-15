// node js/assistant.check.mjs
import assert from 'node:assert/strict';
import { S, transition, VIEW, PROMPTS } from './assistant.js';

const run = (evs, s = S.IDLE) => evs.reduce((st, e) => transition(st, e) ?? st, s);

assert.equal(run(['WAKE', 'AWOKE', 'PROMPT', 'SENT', 'STREAM', 'DONE']), S.COMPLETE);
assert.equal(run(['WAKE', 'AWOKE', 'PROMPT', 'SENT', 'STREAM', 'DONE', 'EXPAND']), S.EXPANDED);
assert.equal(run(['WAKE', 'AWOKE', 'PROMPT', 'SENT', 'STREAM', 'DONE', 'EXPAND', 'COLLAPSE']), S.COMPLETE);
// rapid re-prompt mid-stream restarts listening instead of corrupting state
assert.equal(run(['WAKE', 'AWOKE', 'PROMPT', 'SENT', 'STREAM', 'PROMPT']), S.LISTENING);
// expand is illegal before an answer exists
assert.equal(transition(S.THINKING, 'EXPAND'), null);
assert.equal(transition(S.IDLE, 'DISMISS'), null);
// dismiss from anywhere active, then home
assert.equal(run(['WAKE', 'AWOKE', 'PROMPT', 'DISMISS', 'GONE']), S.IDLE);
// wake during dismissal is allowed (interruptible)
assert.equal(transition(S.DISMISSING, 'WAKE'), S.AWAKENING);
// press-and-hold straight from sleep, then the normal pipeline
assert.equal(run(['HOLD', 'SENT', 'STREAM', 'DONE']), S.COMPLETE);
assert.equal(transition(S.THINKING, 'HOLD'), null); // can't talk over a thought; wait or dismiss
assert.equal(run(['HOLD', 'SENT', 'STREAM', 'DONE', 'EXPAND', 'HOLD']), S.LISTENING);
for (const s of Object.values(S)) assert.ok(VIEW[s], `view for ${s}`);
for (const p of Object.values(PROMPTS)) assert.ok(p.q && p.a);
console.log('assistant state machine: ok');
