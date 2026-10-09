import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceFlow } from '../public/voice-flow.js';
import { commandIntent, wakeCommand } from '../public/voice-intents.js';
import { scenario, engineeringScenario } from '../src/scenario.mjs';

function harness(interpret = async () => 'unknown') {
  const state = { scenario, initial: '', revision: '', followup: null, evidence: null, approved: false, view: 'applicant', busy: false, error: '' };
  const actions = [], replies = [];
  let interpretations = 0, stopped = false;
  const flow = new VoiceFlow({
    state: () => state, update() {}, focus() {}, stop() {}, off() { stopped = true; },
    say: async text => replies.push(text),
    draft: text => { state[state.followup ? 'revision' : 'initial'] = text; },
    interpret: async text => { interpretations++; return interpret(text); },
    action: async (action, original) => {
      actions.push(action);
      if (action === 'scenario') Object.assign(state, { scenario: original === 'engineering' ? engineeringScenario : scenario, initial: '', revision: '', evidence: null, followup: null, approved: false });
      if (action === 'sample') state.initial = state.scenario.sampleAnswer;
      if (action === 'submit') {
        if (!state.followup) { state.followup = { question: 'How would you follow P1?' }; state.revision = state.initial; }
        else state.evidence = { observations: [{ criterion: 'policy', observation: 'Mentions reconciliation.', source: 'revision', quote: 'reconcile' }] };
      }
      if (action === 'share') { state.approved = true; state.view = 'recruiter'; }
      if (action === 'applicant' || action === 'recruiter') state.view = action;
      if (action === 'revise') { state.evidence = null; state.approved = false; }
      if (action === 'unshare') state.approved = false;
    },
  });
  return { state, flow, actions, replies, get interpretations() { return interpretations; }, get stopped() { return stopped; } };
}

test('sleeping guide ignores conversation and accepts the agreed wake phrase', async () => {
  const h = harness();
  await h.flow.hear('use the sample response');
  assert.equal(h.state.initial, '');
  assert.equal(h.interpretations, 0);
  await h.flow.hear('Hi, genmini');
  assert.equal(h.flow.awake, true);
  assert.equal(wakeCommand('I said hi Gemini'), null);
  assert.equal(commandIntent('do not share my evidence'), 'unknown');
});

test('complete hands-free command flow preserves authorship and sharing consent', async () => {
  const h = harness();
  for (const phrase of ['Hi Gemini', 'I want to write a response', 'software engineering', 'use the sample response', 'continue']) await h.flow.hear(phrase);
  assert.equal(h.state.scenario.id, engineeringScenario.id);
  assert.ok(h.state.followup);
  await h.flow.hear('record my answer');
  assert.equal(h.flow.dictating, false);
  await h.flow.hear('yes confirm');
  assert.equal(h.flow.dictating, true);
  const answer = 'I will contain the retry path and reconcile provider status before an approved retry with the original idempotency key.';
  await h.flow.hear(`${answer} Finish my answer.`);
  assert.equal(h.state.revision, answer);
  assert.equal(h.flow.dictating, false);
  await h.flow.hear('submit my revision');
  assert.ok(h.state.evidence);
  assert.equal(h.state.approved, false);
  await h.flow.hear('explain my evidence');
  await h.flow.hear('share my evidence');
  assert.equal(h.state.approved, false);
  await h.flow.hear('yes share it');
  await h.flow.hear('open recruiter view');
  assert.equal(h.state.approved, true);
  assert.equal(h.state.view, 'recruiter');
  assert.equal(h.interpretations, 0);
});

test('dictated command-like words are text, not sharing or model instructions', async () => {
  const h = harness();
  await h.flow.hear('Hi Gemini'); await h.flow.hear('record my answer');
  await h.flow.hear('share my evidence');
  assert.equal(h.state.initial, 'share my evidence');
  assert.deepEqual(h.actions, []);
  assert.equal(h.interpretations, 0);
});

test('draft replacement requires confirmation and stale or expired confirmation is rejected', async () => {
  const h = harness();
  h.state.initial = 'My existing answer';
  await h.flow.hear('Hi Gemini'); await h.flow.hear('use the sample response');
  assert.equal(h.state.initial, 'My existing answer');
  h.state.initial = 'A changed draft';
  await h.flow.hear('yes confirm');
  assert.equal(h.state.initial, 'A changed draft');
  await h.flow.hear('use the sample response'); h.flow.pending.expires = 0;
  await h.flow.hear('yes confirm');
  assert.equal(h.state.initial, 'A changed draft');
});

test('model interpretation never directly submits or changes state', async () => {
  const h = harness(async () => 'sample');
  await h.flow.hear('Hi Gemini'); await h.flow.hear('Can you load an example for me');
  assert.equal(h.state.initial, '');
  assert.equal(h.flow.pending.action, 'sample');
  await h.flow.hear('yes confirm');
  assert.equal(h.state.initial, scenario.sampleAnswer);
});

test('microphone off invalidates an in-flight interpretation and clears confirmation', async () => {
  let resolve;
  const h = harness(() => new Promise(r => { resolve = r; }));
  await h.flow.hear('Hi Gemini');
  const pending = h.flow.hear('please choose an example for me');
  await h.flow.hear('turn off microphone');
  resolve('sample'); await pending;
  assert.equal(h.flow.pending, null);
  assert.equal(h.stopped, true);
  assert.equal(h.state.initial, '');
});

test('interpreted destructive actions still explain their consequences before confirmation', async () => {
  const h = harness(async () => 'sample');
  h.state.initial = 'An existing personal draft';
  await h.flow.hear('Hi Gemini'); await h.flow.hear('load an example for me');
  await h.flow.hear('yes confirm');
  assert.equal(h.state.initial, 'An existing personal draft');
  assert.match(h.replies.at(-1), /Replace the current draft/);
  await h.flow.hear('yes confirm');
  assert.equal(h.state.initial, scenario.sampleAnswer);
});

test('a manual page change stops dictation before writing into another scenario', async () => {
  const h = harness();
  await h.flow.hear('Hi Gemini'); await h.flow.hear('record my answer');
  h.state.scenario = engineeringScenario;
  await h.flow.hear('This answer was intended for the original scenario');
  assert.equal(h.state.initial, '');
  assert.equal(h.flow.dictating, false);
});

test('busy operations reject duplicate submissions and dictate length is bounded', async () => {
  const h = harness();
  await h.flow.hear('Hi Gemini');
  h.state.busy = true; await h.flow.hear('continue');
  assert.deepEqual(h.actions, []);
  h.state.busy = false; await h.flow.hear('record my answer');
  await h.flow.hear('a'.repeat(5001));
  assert.equal(h.state.initial, '');
  assert.equal(h.flow.dictating, false);
});
