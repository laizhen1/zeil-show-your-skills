import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';
import { scenario, engineeringScenario } from '../src/scenario.mjs';
import { validateFollowup, validateEvidence } from '../src/schemas.mjs';

const initial = scenario.sampleAnswer;
const revision = 'Hi Alex, I am sorry you had to contact us again. Please share your order number so I can check the duplicate charge. A confirmed refund takes 3–5 business days, so I cannot promise the money will arrive today. I will escalate the hardship to our support lead and update you within one business day.';
const followup = { question: 'How would you revise the promise of receiving the refund today given the supplied policy?', anchorQuote: 'make sure you get your money back today', policyId: 'P2' };
const evidence = () => ({
  observations: scenario.criteria.map(c => ({ criterion: c.id, status: 'observed', source: 'revision', quote: 'I cannot promise the money will arrive today', observation: 'The revised answer explicitly avoids a promise of same-day arrival.', policyIds: ['P2'] })),
  interviewQuestions: ['How would you respond if the customer still needed immediate help?'],
});
const fixtureGenerator = async (prompt, schema) => ({ data: schema.properties.question ? followup : evidence(), model: 'test-fixture' });

async function harness(t, generate = fixtureGenerator) {
  const app = createApp({ generate });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  const base = `http://127.0.0.1:${app.address().port}`;
  let cookie = '';
  const call = async (path, body, overrides = {}) => {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json', Origin: base } : {}), ...overrides },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    const contentType = response.headers.get('content-type') || '';
    return { status: response.status, data: contentType.includes('json') ? await response.json() : await response.text(), headers: response.headers };
  };
  return { call, base };
}

test('follow-up requires a real excerpt and a known policy', () => {
  assert.equal(validateFollowup(followup, initial), true);
  assert.equal(validateFollowup({ ...followup, anchorQuote: 'an invented promise' }, initial), false);
  assert.equal(validateFollowup({ ...followup, policyId: 'P99' }, initial), false);
  assert.equal(validateFollowup({ ...followup, score: 100 }, initial), false);
});
test('evidence rejects fabricated quotations, duplicate criteria and unsupported source labels', () => {
  assert.equal(validateEvidence(evidence(), initial, revision), true);
  const invented = evidence(); invented.observations[0].quote = 'I have ten years of experience';
  assert.equal(validateEvidence(invented, initial, revision), false);
  const duplicate = evidence(); duplicate.observations[0].criterion = 'policy';
  assert.equal(validateEvidence(duplicate, initial, revision), false);
  const wrongSource = evidence(); wrongSource.observations[0].source = 'initial';
  assert.equal(validateEvidence(wrongSource, initial, revision), false);
});
test('not-shown observations cannot claim a supporting quote', () => {
  const missing = evidence(); missing.observations[0].status = 'not_shown';
  assert.equal(validateEvidence(missing, initial, revision), false);
  missing.observations[0].quote = '';
  assert.equal(validateEvidence(missing, initial, revision), true);
});
test('complete workflow, explicit sharing, withdrawal, revision and reset', async t => {
  const { call } = await harness(t);
  const session = await call('/api/session');
  assert.equal(session.status, 200);
  assert.match(session.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  assert.equal((await call('/api/recruiter')).status, 403);
  assert.equal((await call('/api/share', {})).status, 409);
  assert.equal((await call('/api/evidence', { revision })).status, 409);
  assert.equal((await call('/api/followup', { answer: initial })).status, 200);
  assert.equal((await call('/api/followup', { answer: initial })).status, 409);
  assert.equal((await call('/api/evidence', { revision })).status, 200);
  assert.equal((await call('/api/recruiter')).status, 403);
  assert.equal((await call('/api/share', {})).status, 200);
  const recruiter = await call('/api/recruiter');
  assert.equal(recruiter.data.initial, initial);
  assert.equal(recruiter.data.revision, revision);
  assert.equal((await call('/api/unshare', {})).status, 200);
  assert.equal((await call('/api/recruiter')).status, 403);
  await call('/api/revise', {});
  assert.equal((await call('/api/session')).data.state.evidence, null);
  await call('/api/reset', {});
  assert.equal((await call('/api/session')).data.state.followup, null);
});
test('short and oversized input is rejected before a model call', async t => {
  let calls = 0;
  const { call } = await harness(t, async () => { calls++; return {}; });
  await call('/api/session');
  assert.equal((await call('/api/followup', { answer: 'short' })).status, 400);
  assert.equal((await call('/api/followup', { answer: 'a'.repeat(5001) })).status, 400);
  assert.equal((await call('/api/followup', { answer: null })).status, 400);
  assert.equal(calls, 0);
});
test('invalid AI output does not advance the workflow and can be retried', async t => {
  let calls = 0;
  const { call } = await harness(t, async () => ({ data: ++calls === 1 ? { question: 'bad' } : followup, model: 'test-fixture' }));
  await call('/api/session');
  assert.equal((await call('/api/followup', { answer: initial })).status, 502);
  assert.equal((await call('/api/session')).data.state.followup, null);
  assert.equal((await call('/api/followup', { answer: initial })).status, 200);
});
test('fabricated evidence never becomes shareable', async t => {
  const { call } = await harness(t, async (prompt, schema) => {
    const badEvidence = evidence(); badEvidence.observations[0].quote = 'fabricated content';
    return { data: schema.properties.question ? followup : badEvidence, model: 'test-fixture' };
  });
  await call('/api/session'); await call('/api/followup', { answer: initial });
  assert.equal((await call('/api/evidence', { revision })).status, 502);
  assert.equal((await call('/api/share', {})).status, 409);
});
test('provider failures are recoverable and raw error details are hidden', async t => {
  const { call } = await harness(t, async () => { throw new Error('sensitive upstream diagnostic'); });
  await call('/api/session');
  const result = await call('/api/followup', { answer: initial });
  assert.equal(result.status, 502);
  assert.doesNotMatch(JSON.stringify(result.data), /sensitive upstream/);
  assert.equal((await call('/api/followup', { answer: initial })).status, 502);
});
test('private project files are never served and cross-origin requests are rejected', async t => {
  const { call } = await harness(t);
  for (const path of ['/.env', '/src/gemini.mjs', '/.git/config', '/README.md']) assert.equal((await call(path)).status, 404);
  const page = await call('/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  await call('/api/session');
  assert.equal((await call('/api/followup', { answer: initial }, { Origin: 'https://unrelated.example' })).status, 403);
});
test('session state is isolated between browsers', async t => {
  const { call, base } = await harness(t);
  await call('/api/session'); await call('/api/followup', { answer: initial });
  const unrelated = await fetch(base + '/api/session').then(r => r.json());
  assert.equal(unrelated.state.initial, '');
  assert.equal((await fetch(base + '/api/recruiter')).status, 401);
});

test('engineering workflow uses its runbook and restores the selected scenario', async t => {
  const engineeringRevision = 'I will reconcile the provider status before any retry and reuse the original idempotency key. I will test a timeout after successful payment in the sandbox and verify one charge per order.';
  const { call } = await harness(t, async (prompt, schema) => {
    const parsed = JSON.parse(prompt);
    assert.equal(parsed.scenario.id, engineeringScenario.id);
    assert.equal(parsed.scenario.policies[0].title, 'Contain before replaying');
    assert.equal(parsed.scenario.criteria[0].label, 'Incident communication');
    assert.equal(Object.hasOwn(parsed.scenario, 'sampleAnswer'), false);
    return { model: 'test-fixture', data: schema.properties.question
      ? { question: 'How would you revise the plan to replay payments with a new idempotency key?', anchorQuote: 'replay every timed-out request with a new idempotency key', policyId: 'P1' }
      : { observations: engineeringScenario.criteria.map(c => ({ criterion: c.id, status: 'observed', source: 'revision', quote: 'reuse the original idempotency key', observation: 'The revision specifies reusing the original key for retry safety.', policyIds: ['P1'] })), interviewQuestions: ['How would you confirm the scope of the incident?'] } };
  });
  assert.equal((await call('/api/session')).data.scenarios.length, 2);
  assert.equal((await call('/api/scenario', { scenarioId: engineeringScenario.id })).status, 200);
  assert.equal((await call('/api/session')).data.scenario.id, engineeringScenario.id);
  assert.equal((await call('/api/followup', { scenarioId: engineeringScenario.id, answer: engineeringScenario.sampleAnswer })).status, 200);
  assert.equal((await call('/api/evidence', { scenarioId: engineeringScenario.id, revision: engineeringRevision })).status, 200);
  await call('/api/share', {});
  assert.equal((await call('/api/recruiter')).data.scenario.id, engineeringScenario.id);
  await call('/api/scenario', { scenarioId: scenario.id });
  const restored = (await call('/api/session')).data;
  assert.equal(restored.scenario.id, scenario.id);
  assert.equal(restored.state.initial, '');
  assert.equal(restored.state.followup, null);
  assert.equal(restored.state.evidence, null);
  assert.equal(restored.state.approved, false);
  assert.equal((await call('/api/recruiter')).status, 403);
});

test('unknown scenarios and stale-tab submissions are rejected before model calls', async t => {
  let calls = 0;
  const { call } = await harness(t, async () => { calls++; return {}; });
  await call('/api/session');
  assert.equal((await call('/api/scenario', { scenarioId: 'untrusted-custom-scenario' })).status, 400);
  await call('/api/scenario', { scenarioId: engineeringScenario.id });
  assert.equal((await call('/api/followup', { scenarioId: scenario.id, answer: initial })).status, 409);
  for (const path of ['/api/share', '/api/unshare', '/api/reset', '/api/revise']) {
    assert.equal((await call(path, { scenarioId: scenario.id })).status, 409);
  }
  assert.equal(calls, 0);
});

test('switching scenarios does not reset the session generation limit', async t => {
  let calls = 0;
  const { call } = await harness(t, async () => { calls++; return { data: {} }; });
  await call('/api/session');
  for (let i = 0; i < 12; i++) await call('/api/followup', { answer: initial });
  await call('/api/scenario', { scenarioId: engineeringScenario.id });
  assert.equal((await call('/api/followup', { answer: engineeringScenario.sampleAnswer })).status, 429);
  assert.equal(calls, 12);
});

test('a scenario cannot change while Gemini is preparing a response', async t => {
  let started;
  let release;
  const began = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const { call } = await harness(t, async () => { started(); await gate; return { data: followup, model: 'test-fixture' }; });
  await call('/api/session');
  const pending = call('/api/followup', { answer: initial });
  await began;
  try {
    assert.equal((await call('/api/scenario', { scenarioId: engineeringScenario.id })).status, 409);
  } finally { release(); }
  assert.equal((await pending).status, 200);
  assert.equal((await call('/api/session')).data.scenario.id, scenario.id);
});
