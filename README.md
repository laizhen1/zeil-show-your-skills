# ZEIL Show Your Skills

**ZEIL Show Your Skills helps job applicants demonstrate how they approach realistic work through short, role-specific scenarios, giving recruiters concrete evidence beyond the CV.**

ZEIL Hackathon — 9 October 2026 · Pack 30 · Justin Lai

## Why this idea

Graduates and career changers can struggle to show relevant ability through job titles alone. Recruiters also need concrete examples to inform a useful interview. Today's hackathon lets candidates demonstrate their approach through actual work; this prototype explores bringing that principle into a lightweight, optional ZEIL application feature.

Product hypothesis: an employer-approved, short fictional work scenario can give recruiters useful evidence without turning every application into a lengthy assessment. This hypothesis still needs validation with ZEIL and users.

## Proposed core experience

1. An employer reviews and approves a scenario drafted from a job description.
2. After applying, an applicant optionally responds to the scenario and one contextual follow-up.
3. The applicant previews an evidence card before sharing it.
4. A recruiter sees exact excerpts, the applicant's revision, and unresolved interview questions.

The first role family is customer support. The demo uses a fictional double-charge complaint and a supplied refund policy. The interesting moment is how an applicant revises their response when asked about a policy constraint.

Evidence cards describe observed responses; they do not rank candidates, infer personal traits, or make hiring decisions. The exercise is optional and does not block an application. It is not proof of identity or independent authorship.

## Current implementation: 10:10 foundation checkpoint

- Idea and rationale recorded in this README.
- Server-side Gemini connectivity check implemented.
- Private environment configuration excluded from Git.
- Secret scan provided for staged/tracked files.
- No product UI or ZEIL integration has been implemented yet.

See [checkpoint evidence](docs/checkpoint-1010.md) for verified outcomes.

## Run the connection check

Requires Node.js 22 or newer. No dependency installation is needed for this initial checkpoint.

1. Copy `.env.example` to `.env` in this project folder.
2. Set `GEMINI_API_KEY` privately in `.env`. Do not paste the key into chat, browser code, a shell profile or a coding assistant's configuration.
3. Run `npm run check:gemini` from this directory.

The check makes a small request to Google's Gemini API and prints its greeting, never the key. It uses the event-recommended `gemini-flash-latest` alias. Shared-quota/server errors get at most two retries with backoff. The event key is for the product, not coding-agent usage.

Before each push, stage intended files and run `npm run check:secrets`. Confirm that `.env` remains ignored. The scan is a targeted guard for environment files and Google API keys, not a comprehensive secret detector.

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

At this checkpoint, `src/gemini.mjs` is a Node-only API boundary using built-in `fetch`; `scripts/check-gemini.mjs` exercises it. The REST request follows the event quickstart. No third-party starter kit or previous project code was imported.

AI was used for planning and coding assistance.

Keep the repository private and share it with the organiser identified in the event instructions. The final submission requires a video of at most three minutes with the participant on camera, repository access, bonus evidence and pack number 30 before 16:00 NZ time.
