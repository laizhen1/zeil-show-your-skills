# ZEIL Show Your Skills

**ZEIL Show Your Skills helps job applicants demonstrate how they approach realistic work through short, role-specific scenarios, giving recruiters concrete evidence beyond the CV.**

ZEIL Hackathon — 9 October 2026 · Pack 30 · Justin Lai

## Why this idea

Graduates and career changers can struggle to show relevant ability through job titles alone. Recruiters also need concrete examples to inform a useful interview. Today's hackathon lets candidates demonstrate their approach through actual work; this prototype explores bringing that principle into a lightweight, optional ZEIL application feature.

Product hypothesis: an employer-approved, short fictional work scenario can give recruiters useful evidence without turning every application into a lengthy assessment. This hypothesis still needs validation with ZEIL and users.

## Core experience

1. The applicant opens a fixed, reviewed customer-support scenario with a supplied refund policy. Employer generation and approval controls are an optional later addition.
2. After applying, an applicant optionally responds to the scenario and one contextual follow-up.
3. The applicant previews an evidence card before sharing it.
4. A recruiter sees exact excerpts, the applicant's revision, and unresolved interview questions.

The first role family is customer support. The demo uses a fictional double-charge complaint and a supplied refund policy. The interesting moment is how an applicant revises their response when asked about a policy constraint.

Evidence cards describe observed responses; they do not rank candidates, infer personal traits, or make hiring decisions. The exercise is optional and does not block an application. It is not proof of identity or independent authorship.

## Current implementation: 12:06 core checkpoint

- JavaScript frontend with ZEIL reference styling, applicant and recruiter perspectives.
- Actual server-side Gemini calls for one adaptive follow-up and structured evidence generation.
- Four evidence criteria: communication, policy handling, ownership and adaptation.
- JSON Schema validation and exact-quotation checks before model output is accepted.
- Applicant preview, explicit sharing with the local recruiter view, withdrawal and revision.
- Original answer and revised answer remain visible beside the evidence.
- Recoverable provider and validation errors; the current form text is retained on failure.
- Per-session request limit, bounded retries, private server-side key and restricted static-file serving.

The prototype uses fictional records. It has no live ZEIL API integration or actual employer delivery. Scenarios generated from a job description, durable shareable links, a second reviewer model and scored AI evaluation are not implemented yet.

Verification records: [initial connection](docs/checkpoint-1010.md) and [core workflow](docs/checkpoint-1206.md).

## Run locally

Requires Node.js 22 or newer. The application uses built-in Node APIs and browser JavaScript; run npm install before starting. No frontend build step is required.

1. Copy `.env.example` to `.env` in this project folder.
2. Set `GEMINI_API_KEY` privately in `.env`. Do not paste the key into chat, browser code, a shell profile or a coding assistant's configuration.
3. Run `npm start` from this directory.
4. Open http://127.0.0.1:4173 in your browser.

`npm run dev` enables server restart on code changes. A server restart clears demo sessions. Browser assets require a page reload after editing.

## Verify Gemini and the core API

- `npm run check:gemini`: make one real Gemini request and print a greeting.
- `npm test`: run deterministic validation and HTTP integration tests with a fixture model; these do not call Gemini or consume quota.
- With the application running, `npm run check:core`: run the complete HTTP workflow using two real Gemini requests and fictional answers. It verifies the follow-up, all four evidence criteria, exact quotations, approval, recruiter access and withdrawal.

The engineering tests are not a claim for the "Prove it works" AI evaluation bonus. A scored set of model inputs and measured before/after improvement remains later work.

The check makes a small request to Google's Gemini API and prints its greeting, never the key. It uses the event-recommended `gemini-flash-latest` alias. Shared-quota/server errors get at most two retries with backoff. The event key is for the product, not coding-agent usage.

## Demo walkthrough

1. Read the customer message and the four policy references.
2. Enter an answer or select "Use a fictional sample response". The sample deliberately promises a same-day refund that the policy does not support.
3. Continue to generate one follow-up grounded in the answer and a policy reference.
4. Revise the answer and explain the change, then select "Preview my evidence card".
5. Inspect the four observations, exact source excerpts, policy links and interview questions.
6. Select "Share with recruiter preview". The recruiter view shows the same evidence plus both source answers.
7. Return to the applicant view to withdraw sharing or revise the response.

Sharing only changes access between perspectives within this local demo session; it does not send an application or contact an employer. Draft text is retained in the current page during failures, but unsent edits are lost on reload. Successfully processed answers are restored from the session while it remains active.

## API boundary

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/session` | Create or restore an isolated session and return the fixed scenario and processed state. |
| `POST /api/followup` | Validate `answer`, call Gemini, validate the question and exact anchor quote, then retain the result. |
| `POST /api/evidence` | Validate `revision`, call Gemini using server-held original answer and follow-up, then validate all four observations and quotes. |
| `POST /api/share` | Approve the current evidence for the local recruiter preview. |
| `GET /api/recruiter` | Return evidence only after applicant approval. |
| `POST /api/unshare` | Withdraw approval. |
| `POST /api/revise` | Withdraw approval and clear the previous evidence before editing. |
| `POST /api/reset` | Clear this attempt while preserving the session's request limit. |

POST endpoints accept JSON. Answers must contain 40–5,000 characters. Sessions expire after two hours, have a twelve-generation-request limit, and use memory locally or a private Vercel Blob store when hosted. Conditional writes prevent concurrent requests from overwriting state. Access expires after two hours; private stored records remain until the project owner removes them. Use fictional data only. Real authentication and employer permissions remain integration work.

Before each push, stage intended files and run `npm run check:secrets`. Confirm that `.env` remains ignored. The scan is a targeted guard for environment files and Google API keys, not a comprehensive secret detector.

## Vercel deployment

Import this repository with the Node preset. Set GEMINI_API_KEY as a sensitive server environment variable and connect a private Vercel Blob store. The store provides BLOB_READ_WRITE_TOKEN or BLOB_STORE_ID. The server fails closed if deployed without private storage. Never put credentials in frontend variables.

The root server.mjs starts the Node HTTP application. Git pushes to the connected production branch trigger deployments. Set APP_URL to the deployment origin when running npm run check:core against the hosted app.

## Integration boundary

Proposed inputs: a ZEIL job record and an application identifier. Proposed outputs: an approved scenario linked to the job and an applicant-approved evidence card linked to the application. Use sample records until ZEIL provides its internal API contracts, authentication and permissions. This is an independent hackathon prototype, not an existing ZEIL integration.

## 10:36 checkpoint: scope locked

### Required demo feature

An applicant completes a realistic customer-support scenario, responds to one adaptive follow-up, and produces an evidence card a recruiter can inspect.

Start with one fixed, reviewed fictional double-charge scenario and a supplied refund policy. The applicant submits an initial answer, receives one contextual follow-up, submits a revision, and previews the resulting evidence. The recruiter view shows exact answer excerpts, the revision and unresolved interview questions. No accounts, external messaging, live ZEIL integration or general-purpose assessment platform are required for the demo.

Acceptance criteria:

- The full scenario-to-evidence workflow runs with actual Gemini responses.
- The follow-up references the applicant's answer and the supplied scenario or policy.
- Evidence excerpts are validated against the submitted text; unsupported excerpts are rejected.
- Structured output is validated before rendering, with clear recovery for malformed output, network errors and quota errors.
- The recruiter can inspect the original answer and revision; no automated hiring decision is produced.
- The key remains on the server and no raw credential appears in application output.

### Optional additions (maximum two)

1. Employer scenario editor: generate a scenario from a job description, then edit and approve it.
2. Shareable evidence card: save an applicant-approved card and open it through a recruiter-view link, using fictional demo data.

Neither addition is required to complete the core demo. A local recruiter preview is sufficient for the required workflow; durable storage and link sharing are optional.

### Selected bonus challenges

| Priority | Challenge | Potential points | Required evidence |
| --- | --- | ---: | --- |
| Core | Built for hiring | 20 | Demonstrate the applicant and recruiter workflow and its practical benefit. |
| Core | Strict shapes | 5 | JSON schema, validation and a demonstrated invalid-output path. |
| Next | Prove it works | 10 | At least ten fixed test inputs, expected results, a scoring script and actual before/after results from one improvement. |
| Stretch | Two brains | 15 | A separate reviewer model catches unsupported evidence; show the hand-off and measured benefit over the first pass. |

The potential total is 50, subject to the bonus cap and judging. These are selected targets, not completed claims. A second model is retained only if it demonstrably improves evidence quality and fits the remaining time. Deterministic quote validation remains required even without that model.

### Delivery cutoffs (9 October, Auckland time)

- By 12:06: core workflow runs end to end locally and is pushed. If behind, defer both optional additions and finish the fixed-scenario path.
- By 13:00: rehearse the demo start to finish; read the midpoint challenge and reassess bonus priorities without disrupting the core.
- By 14:00: finish evaluation and decide whether the reviewer model is reliable enough to include. Drop it if benefit, latency or quota usage is unacceptable.
- By 14:48: freeze features; only fixes, presentation polish and README updates remain. No optional addition starts unless core acceptance criteria already pass and sufficient verification time remains.
- From 15:00: prepare and record the three-minute video with the participant on camera; reserve time to upload and check access.
- By 15:42: submit, leaving a buffer before the 16:00 deadline.

Use a single application and server-side Gemini boundary. Keep calls sequential and limited: one follow-up call, one evidence-generation call, and an optional review call. Use fixed fixtures to debug UI and validation without consuming shared model quota; final demo and evaluation evidence must clearly distinguish real calls from fixtures.

## Architecture and acknowledgements

`src/server.mjs` serves a whitelist of frontend assets and manages session state. `src/gemini.mjs` calls Gemini's REST API with structured output; `src/schemas.mjs` validates the JSON and source excerpts; `src/prompts.mjs` defines the two narrow model tasks. `public/app.js` implements the applicant and recruiter workflow. No frontend receives the key.

The REST request follows the event quickstart and Google's [structured-output API](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). No third-party starter kit or previous project code was imported. Existing ZEIL logo and font assets are used for the private prototype; sources are listed in [asset acknowledgements](public/assets/NOTICE.md).

AI was used for planning and coding assistance.

Keep the repository private and share it with the organiser identified in the event instructions. The final submission requires a video of at most three minutes with the participant on camera, repository access, bonus evidence and pack number 30 before 16:00 NZ time.
