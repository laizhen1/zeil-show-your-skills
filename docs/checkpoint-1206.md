# Core workflow verification

Verified on 9 October 2026, approximately 11:19 Auckland time, ahead of the 12:06 checkpoint.

## Live browser walkthrough

The JavaScript application was exercised in Chrome against the local Node server and real Gemini API. The sample initial answer incorrectly promised a same-day refund. Gemini cited that exact promise and asked the applicant to revise it using policy P2. After a revised answer explained the 3–5 business day timeframe, the evidence card displayed all four criteria with source quotations and policy references. Applicant approval opened the recruiter view with the original answer, revision and evidence visible.

## Repeatable API verification

Command: `npm run check:core`, with `npm start` running separately.

The second live run used an initial answer that already followed the refund policy. Gemini asked about managing expectations around escalation under P3, rather than incorrectly asserting a same-day promise. The script then verified evidence generation, exact source quotations, approval-gated access and withdrawal.

Result: PASS. Returned model version: `gemini-3.8-flash`.

## Deterministic tests

Command: `npm test`.

Result: 10 passed, 0 failed. Fixture model responses were used for these engineering tests; no Gemini quota was consumed.

Coverage includes exact quote validation, schema rejection, duplicate criteria, missing evidence, state transitions, input limits, invalid-output retry, fabricated evidence rejection, safe provider errors, private-file protection, cross-origin request rejection and session isolation.

## Current limitations

- Fixed fictional scenario; no employer editor yet.
- Local session preview, not cross-device sharing or an actual ZEIL application.
- Sessions are in memory and expire after two hours or a server restart.
- Exact quotation checks establish that the cited text exists, not that every AI interpretation is correct. A human must review the observations.
- No second reviewer model or scored before/after AI evaluation is claimed at this checkpoint.
