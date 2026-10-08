# Foundation checkpoint

Event: ZEIL Hackathon, 9 October 2026 (NZ time), Pack 30.

## Idea selected

ZEIL Show Your Skills: optional, employer-approved work scenarios that produce evidence cards for recruiter review. Initial role family: customer support. Rationale and proposed integration boundary are in the README.

## Gemini verified

The project's `npm run check:gemini` command completed successfully against Google's Gemini API on 9 October 2026 (NZ time).

- Requested model alias: `gemini-flash-latest`.
- Returned model version: `gemini-3.8-flash`.
- Actual response: `Hello ZEIL Hackathon! Show Your Skills is connected.`
- API key stored only in the ignored project `.env` file.
- Connection check calls Gemini from Node.js; there is no frontend credential exposure.

## Repository

Private repository: https://github.com/laizhen1/zeil-show-your-skills

- Initial commit `6f3dff4` pushed to `main` under Justin Lai's configured Git identity.
- Collaborator invitation sent to `mustafa.sheikh@zeil.com` (GitHub account `mzeils`); awaiting acceptance.
- Staged-content secret scan passed for all eight project files before the initial push; `.env` is ignored and untracked.

This initial checkpoint contains the idea, configuration template, connection script and staged-content secret scan. Product UI and actual ZEIL API integration belong to subsequent development.
