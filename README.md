# ZEIL Show Your Skills

**Show Your Skills helps applicants demonstrate their reasoning through a short work scenario and gives recruiters evidence beyond the CV.**

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

## Next checkpoint: scope locked

Define the exact demo path and acceptance criteria before adding UI. Prioritise employer-approved scenario → response → one follow-up → evidence card. If time is tight, use one fixed approved scenario first. Reassess optional work when the 13:00 midpoint challenge is revealed.

## Architecture and acknowledgements

At this checkpoint, `src/gemini.mjs` is a Node-only API boundary using built-in `fetch`; `scripts/check-gemini.mjs` exercises it. The REST request follows the event quickstart. No third-party starter kit or previous project code was imported.

AI assistance: Codex was used for planning, initial code, documentation and repository setup. Product direction and idea selection: Justin Lai.

Keep the repository private and share it with the organiser identified in the event instructions. The final submission requires a video of at most three minutes with the participant on camera, repository access, bonus evidence and pack number 30 before 16:00 NZ time.
