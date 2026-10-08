// Real end-to-end Gemini check. Start the application first with npm start.
// Uses fictional answers and a separate session; makes two model requests.
import assert from 'node:assert/strict';
import { validateFollowup, validateEvidence } from '../src/schemas.mjs';
import { engineeringScenario } from '../src/scenario.mjs';

const base = process.env.APP_URL || 'http://127.0.0.1:4173';
let cookie;
async function call(path, body, expected = 200) {
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json', Origin: base } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(160_000),
  });
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  const data = await response.json();
  if (response.status !== expected) throw new Error(`Request ${path}: HTTP ${response.status}. ${data.error || 'Unexpected response.'}`);
  return data;
}

try {
  await call('/api/session');
  const engineering = process.env.SCENARIO === 'engineering';
  if (engineering) await call('/api/scenario', { scenarioId: engineeringScenario.id });
  await call('/api/recruiter', undefined, 403);
  const initial = engineering ? engineeringScenario.sampleAnswer : 'Hi Alex, I am sorry you have had to contact us again. I understand the duplicate charge is causing an urgent problem. Please share your order number, but not your card details, so I can verify the payment record. If the duplicate charge is confirmed, I will arrange the refund. Funds normally arrive in 3–5 business days and I cannot guarantee a same-day refund. I will escalate the urgent hardship to our support lead and update you within one business day. My next action is to verify the order and payment record.';
  const first = await call('/api/followup', { answer: initial });
  assert.ok(validateFollowup(first.followup, initial), 'Follow-up must cite the actual answer and a known policy.');
  console.log(`Live follow-up: ${first.followup.question}`);
  const revision = engineering
    ? 'Hi Sam, we have three reports of possible duplicate charges after the retry update. The release is a hypothesis, not a confirmed cause. I will notify the incident lead and coordinate disabling the affected retry path or rolling back. I will not replay a timed-out payment until I reconcile its status with the provider. A timeout may occur after a successful charge. Any approved retry must reuse the original idempotency key. I will compare pre- and post-release behaviour using redacted order IDs, request IDs, idempotency keys and provider transaction status. In the sandbox I will test a timeout after successful payment and repeated submissions, verifying at most one charge per order and correct reconciliation. I will monitor production with the incident lead. I will send an update within 15 minutes with known impact, uncertainties, actions, owner and next update, and coordinate confirmed duplicate charges with support. I will not promise recovery or refund times before verification. I changed my original replay plan because a new key could cause another charge; a passing health check alone would not prove recovery.'
    : initial + '\n\nIf the lead cannot accelerate the refund, I would explain that honestly and avoid promising compensation. I would document the duplicate transaction, the customer’s stated urgency, the escalation, and the next update time. I would send the promised update even if the refund was still processing.';
  const second = await call('/api/evidence', { revision });
  assert.ok(validateEvidence(second.evidence, initial, revision), 'Evidence must contain all four criteria and exact source quotations.');
  await call('/api/recruiter', undefined, 403);
  await call('/api/share', {});
  const shared = await call('/api/recruiter');
  assert.equal(shared.initial, initial);
  assert.equal(shared.revision, revision);
  assert.deepEqual(shared.evidence, second.evidence);
  if (engineering) assert.equal(shared.scenario.id, engineeringScenario.id);
  await call('/api/unshare', {});
  await call('/api/recruiter', undefined, 403);
  console.log(`Core API: PASS. Follow-up, evidence validation, approval, recruiter preview and withdrawal verified. Model: ${second.model}.`);
  console.log(`Evidence criteria: ${second.evidence.observations.map(item => item.criterion).join(', ')}.`);
} catch (error) {
  console.error(`Core API: FAIL. ${error.message}`);
  process.exitCode = 1;
}
