# ZEIL Show Your Skills

**ZEIL Show Your Skills helps job applicants demonstrate how they approach realistic work through short, role-specific scenarios, giving recruiters concrete evidence beyond the CV.**

ZEIL Hackathon — 9 October 2026 · Pack 30 · Justin Lai

Live demo: https://zeil-show-your-skills.vercel.app/ — no installation or login required. Use fictional responses only. Both perspectives are available within one demo session after applicant approval.

Judges can test the application directly using the [guided assessment walkthrough](#guided-assessment-walkthrough). The live application supplements the required submission video.

## Why this idea

Graduates and career changers can struggle to show relevant ability through job titles alone. Recruiters also need concrete examples to inform a useful interview. Today's hackathon lets candidates demonstrate their approach through actual work; this prototype explores bringing that principle into a lightweight, optional ZEIL application feature.

Product hypothesis: an employer-approved, short fictional work scenario can give recruiters useful evidence without turning every application into a lengthy assessment. This hypothesis still needs validation with ZEIL and users.

## Core experience

1. The applicant chooses one of two fixed scenarios: customer support with a refund policy, or software engineering with an incident runbook. Employer generation and approval controls are an optional later addition.
2. After applying, an applicant optionally responds to the scenario and one contextual follow-up.
3. The applicant previews an evidence card before sharing it.
4. A recruiter sees exact excerpts, the applicant's revision, and unresolved interview questions.

The demo includes a fictional customer-support double-charge complaint and a software-engineering payment incident. Each has its own reference rules, sample answer and criterion labels. The interesting moment is how an applicant revises their response when asked about a policy constraint.

Evidence cards describe observed responses; they do not rank candidates, infer personal traits, or make hiring decisions. The exercise is optional and does not block an application. It is not proof of identity or independent authorship.

## Current implementation: 12:06 core checkpoint

- JavaScript frontend with ZEIL reference styling, applicant and recruiter perspectives.
- Actual server-side Gemini calls for one adaptive follow-up and structured evidence generation.
- Four evidence criteria with role-specific labels: communication, handling of reference rules, ownership and adaptation.
- JSON Schema validation and exact-quotation checks before model output is accepted.
- Applicant preview, explicit sharing with the local recruiter view, withdrawal and revision.
- Original answer and revised answer remain visible beside the evidence.
- Recoverable provider and validation errors; the current form text is retained on failure.
- Per-session request limit, bounded retries, private server-side key and restricted static-file serving.

The prototype uses fictional records. It has no live ZEIL API integration or actual employer delivery. Scenarios generated from a job description, durable shareable links, a second reviewer model and scored AI evaluation are not implemented yet.

Verification records: [initial connection](docs/checkpoint-1010.md), [core workflow](docs/checkpoint-1206.md) and [public deployment](docs/deployment.md).

## Run locally

Requires Node.js 22 or newer. The application uses built-in Node APIs and browser JavaScript; run npm install before starting. No frontend build step is required.

1. Run `npm install`, then copy `.env.example` to `.env` in this project folder.
2. Set `GEMINI_API_KEY` privately in `.env`. Do not paste the key into chat, browser code, a shell profile or a coding assistant's configuration.
3. Run `npm start` from this directory.
4. Open http://127.0.0.1:4173 in your browser.

`npm run dev` enables server restart on code changes. A server restart clears demo sessions. Browser assets require a page reload after editing.

## Verify Gemini and the core API

- `npm run check:gemini`: make one real Gemini request and print a greeting.
- `npm test`: run deterministic validation and HTTP integration tests with a fixture model; these do not call Gemini or consume quota.
- With the application running, `npm run check:core`: run the complete HTTP workflow using two real Gemini requests and fictional answers. It verifies the follow-up, all four evidence criteria, exact quotations, approval, recruiter access and withdrawal.

The core check defaults to customer support. Set `SCENARIO=engineering` to verify the software-engineering workflow instead. Set `APP_URL` to the server origin to check a local or hosted instance. For example, in PowerShell:

```powershell
$env:SCENARIO = 'engineering'
$env:APP_URL = 'https://zeil-show-your-skills.vercel.app'
npm run check:core
```

The engineering tests are not a claim for the "Prove it works" AI evaluation bonus. A scored set of model inputs and measured before/after improvement remains later work.

The check makes a small request to Google's Gemini API and prints its greeting, never the key. It uses the event-recommended `gemini-flash-latest` alias. Shared-quota/server errors get at most two retries with backoff. The event key is for the product, not coding-agent usage.

## Guided assessment walkthrough

This walkthrough demonstrates an applicant responding to feedback, inspecting an evidence card and explicitly approving recruiter access. Allow approximately five minutes, including model response time. The prompts below use fictional information and can be copied directly into the application.

### 1. Open the application

Open [the live demo](https://zeil-show-your-skills.vercel.app/). No account, installation or API key entry is required. A new session starts in **Applicant view** with the heading **Let your work do the talking.**

If returning to an existing attempt, select **Applicant view**. If an evidence card is displayed, select **Revise my response**, then **Start a new attempt** and confirm the reset. This discards that attempt's answers and evidence. Alternatively, open the live URL in a fresh private browsing session.

### 2. Submit the initial response

Select **Customer Support Specialist** under **Choose your work scenario**. Read **One customer. Two charges.** and the four refund-policy references. Scroll to **How would you respond?**, then select **Use a fictional sample response**. The application fills **Your response and next action** automatically.

The sample deliberately promises that the customer will receive the refund today, although policy P2 states that funds normally arrive in 3–5 business days and same-day arrival cannot be guaranteed.

Select **Continue to my follow-up** once and wait for **A fresh perspective** to appear. This action makes a real Gemini request. The result should contain one contextual question, an exact excerpt from the initial response and a policy reference. Wording varies between runs; the same-day refund promise is the intended issue for this example.

### 3. Enter the revised response

In **Your revised response and reasoning**, replace all existing text with the following:

```text
Hi Alex, I am sorry you have had to contact us again about the duplicate charge, especially when you need the money for groceries. Please send your order number so I can verify the payment record. Please do not send full card details.

If I confirm a duplicate payment, I will arrange a refund. Funds normally arrive in 3–5 business days; I cannot guarantee arrival today. I will escalate your urgent financial hardship to our support lead, although this does not guarantee a faster refund or compensation. I will update you within one business day.

I changed my earlier promise of same-day arrival because P2 does not allow that guarantee. I would verify the records first, arrange any confirmed duplicate refund, and track the escalation and update.
```

If the generated follow-up raises another issue, adjust the revision to address that question before continuing.

Select **Preview my evidence card** once and wait for **Your work. In your own words.** This action makes the second real Gemini request.

### 4. Inspect the result

The card initially displays **Private preview**. Inspect the four criteria: **Customer communication**, **Policy handling**, **Ownership** and **Adaptation**. Each supported observation includes an exact quotation and identifies its source response. Select **View source** to inspect the quoted text in context.

Scroll to **The work behind the card** to compare the original and revised responses and read the follow-up. Review **Worth exploring in an interview** for suggested questions. The application validates output structure and quotations before displaying the card. Generated observations can vary and still require human judgment; the card provides no overall candidate score or hiring decision.

### 5. Open the recruiter perspective

Select **Share with recruiter preview**. The application switches to **Recruiter view**, showing **See the thinking behind the answer.** and **Shared in demo**. Inspect the observations alongside both source answers. This demonstrates the applicant's approval step; it does not contact an employer or submit a real application.

### 6. Verify withdrawal (optional)

Select **Back to applicant view**, then **Withdraw from preview**. The card becomes private again and **Recruiter view** becomes unavailable. This step makes no Gemini request.

### Alternative walkthrough: software engineering

1. Under **Choose your work scenario**, select **Software Engineer**. Confirm the reset if a previous attempt exists. Read **One deployment. Duplicate payments.** and the incident runbook.
2. Select **Use a fictional sample response**, then **Continue to my follow-up**. The sample deliberately proposes replaying timed-out payments with new idempotency keys, conflicting with runbook P1. Gemini should ask a grounded question about this risk; exact wording varies.
3. In **Your revised response and reasoning**, replace the sample with the text below. Adjust it if necessary to address the actual follow-up, then select **Preview my evidence card**.

```text
Hi Sam, we have three reports of possible duplicate charges after the retry update. The release is a hypothesis, not a confirmed cause. I will notify the incident lead and coordinate disabling the affected retry path or rolling back while we investigate.

I will not replay a timed-out payment until I reconcile its status with the provider. A timeout may occur after a successful charge. Any approved retry must reuse the original idempotency key, rather than creating a new one. I will compare pre- and post-release behaviour using redacted order IDs, request IDs, idempotency keys and provider transaction status.

In the sandbox I will test a timeout after successful payment and repeated submissions, verifying at most one charge per order and correct reconciliation. I will monitor production with the incident lead after mitigation. I will send an update within 15 minutes with known impact, uncertainties, actions, owner and the next update, and coordinate confirmed duplicate charges with support. I will not promise a recovery or refund time before verification.

I changed my original replay plan because a new key could cause another charge. Reconciliation and reuse of the original key address that risk; a passing health check alone would not prove recovery.
```

4. Inspect **Incident communication**, **Technical reasoning and risk**, **Investigation and recovery** and **Adaptation**, including exact excerpts and both source answers.
5. Select **Share with recruiter preview** to inspect the recruiter perspective. Withdrawal works as described above.

For either scenario, applicants can select **Write my own response** and type their own answer instead of loading a sample. This clears an existing draft only after confirmation. Selecting a scenario or loading a sample does not call Gemini. Changing scenarios clears the previous attempt and sharing approval but preserves the session's generation limit. The application supports these two reviewed examples; custom scenario creation is not included.

### Usage and recovery

A normal complete walkthrough makes two Gemini requests. Reading results, switching perspectives, sharing and withdrawing do not call Gemini. Regenerating evidence makes another request, and automatic retries can add requests. The application limits each two-hour session to twelve generation requests; this is an application safeguard, not the organiser's token allowance.

If a provider or validation error appears, the current form text remains available. Wait before retrying; do not repeatedly submit while a request is running. Unsent edits are lost on reload, while successfully processed answers are restored during the active session.

The [hackathon FAQ](https://hackathon.zeil.com/#faq) states that the event keys share a quota and expire on **12 October 2026 at 18:00 NZ time**. AI generation depends on that key remaining active and quota being available. The live demo complements the required video of at most three minutes with the participant on camera.

## API boundary

| Endpoint | Behaviour |
| --- | --- |
| `GET /api/session` | Create or restore an isolated session and return scenario choices, the selected scenario and processed state. |
| `POST /api/scenario` | Select a supported `scenarioId`, clear the previous attempt and withdraw sharing without resetting the generation limit. |
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
| Verified deployment | Ship it | 10 | Public demo without login; real Gemini workflow verified. See deployment evidence. |
| Midpoint priority | No hands | 25 | A complete voice-controlled exercise in an uncut demo, with hands visible and off keyboard, mouse and trackpad. Microphone rehearsal and recorded evidence are required. |

The submission claims Built for hiring, Strict shapes, Ship it and the midpoint No hands challenge. Their potential total is 60, subject to the 50-point bonus cap and judging. The [submitted demo video](https://drive.google.com/file/d/1NTwNo-IEV8djZURzKV0HB42Xkax1cPxS/view) provides the recorded workflow evidence; automated controller tests do not establish hands-free completion.

For Strict shapes, see `src/schemas.mjs`, `src/gemini.mjs` and the invalid-output and fabricated-quotation cases in `test/core.test.mjs`. For No hands, see the recorded demonstration and `public/voice.js`, `public/voice-flow.js` and `public/voice-intents.js`. The voice guide uses browser speech recognition and synthesis; it does not claim Gemini Live or audio-input bonuses. The recorded sample workflow keeps the fictional engineering response unchanged to avoid long dictation in a noisy room; it demonstrates navigation and evidence generation, not an improved answer. Applicants can separately type or dictate their own revision.

### Delivery cutoffs (9 October, Auckland time)

- By 12:06: core workflow runs end to end locally and is pushed. If behind, defer both optional additions and finish the fixed-scenario path.
- By 13:00: rehearse the demo start to finish; read the midpoint challenge and reassess bonus priorities without disrupting the core.
- By 14:00: rehearse the complete microphone flow, verify model responses and confirm which bonus challenges can be demonstrated reliably.
- By 14:48: freeze features; only fixes, presentation polish and README updates remain. No optional addition starts unless core acceptance criteria already pass and sufficient verification time remains.
- From 15:00: prepare and record the three-minute video with the participant on camera; reserve time to upload and check access.
- By 15:42: submit, leaving a buffer before the 16:00 deadline.

Use a single application and server-side Gemini boundary. Keep calls sequential and limited: one follow-up call, one evidence-generation call, and an optional review call. Use fixed fixtures to debug UI and validation without consuming shared model quota; final demo and evaluation evidence must clearly distinguish real calls from fixtures.

## Architecture and acknowledgements

`src/server.mjs` serves a whitelist of frontend assets and manages session state. `src/gemini.mjs` calls Gemini's REST API with structured output; `src/schemas.mjs` validates the JSON and source excerpts; `src/prompts.mjs` defines the two narrow model tasks. `public/app.js` implements the applicant and recruiter workflow. No frontend receives the key.

The REST request follows the event quickstart and Google's [structured-output API](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). No third-party starter kit or previous project code was imported. Existing ZEIL logo and font assets are used for the private prototype; sources are listed in [asset acknowledgements](public/assets/NOTICE.md).

AI was used for planning and coding assistance.

Keep the repository private and share it with the organiser identified in the event instructions. The final submission requires a video of at most three minutes with the participant on camera, repository access, bonus evidence and pack number 30 before 16:00 NZ time.

## Voice guide and hands-free walkthrough

Open **Voice guide** at the bottom-right of the page. The compact chat panel shows the conversation, microphone state and a purple processing indicator. It remains available across scenario and evidence screens. Motion is disabled when the browser requests reduced motion.

### Setup

Use desktop Chrome with a microphone and audio output. Select **Enable microphone** and allow Chrome's microphone permission. Keep the website tab active. The microphone starts off, is never enabled automatically on reload, and turns off when the tab becomes hidden. Headphones can improve recognition in a noisy room.

Before starting, hover over **Enable microphone** (or focus it with the keyboard), then select **Test microphone** in its popover. Grant microphone permission, then speak or tap near the microphone. The top-right input meter and purple light respond to detected sound. This local 15-second check does not record audio, send audio to a service, or call Gemini. It reports sound detection or suggests checking the mute switch, input volume and browser device selection. It checks input level, not transcription accuracy. Select **Enable microphone** afterwards to begin the guide. During voice mode the indicator distinguishes microphone off, waiting for the wake phrase, listening, preparing a response and guide playback; its light continues to reflect actual input activity.

Chrome's speech recognition may send audio to its speech service, including while waiting for the wake phrase. The application does not store raw audio. Dictated answers use the same private session and submission flow as typed answers. Common commands are matched in the browser; unfamiliar commands are sent as text to Gemini with a fixed instruction and a strict action schema. The guide asks for confirmation before executing an interpreted command. Each session permits eight such interpretation requests, separately from the twelve core generation requests. Listed commands continue to work without those interpretation requests.

This implementation uses browser speech recognition and synthesis, not Gemini Live or Gemini audio input. It targets the **No hands** challenge; it does not claim the **Live** or **Eyes and ears** bonuses. Actual microphone recognition depends on Chrome, device permission, network access and the environment.

### Recorded exercise

After microphone setup, keep hands visible and off the keyboard, mouse and trackpad throughout the complete exercise. Wait for **Listening** before speaking. Readbacks can be interrupted with **Stop speaking**; the corresponding button is also available outside a hands-free demonstration.

1. Say **Hi Gemini**. The guide wakes and offers to start or review a work sample.
2. Say **I want to write a response**, then **Software engineering** (or **Customer support**).
3. Say **Read the scenario** or **Read the reference** if needed.
4. Say **Use the sample response**, or **Record my answer** and dictate an original answer. End dictation with **Finish my answer**. The sample deliberately contains a reference conflict and is labelled fictional.
5. Say **Read my answer** to check the draft, then **Continue**. Gemini generates the follow-up and the guide reads it aloud.
6. Say **Record my answer**, then **Yes, confirm** to replace the copied original draft. Dictate a revision in your own words and finish with **Finish my answer**. Alternatively, **Add to my answer** appends dictated text. The guide never writes an improved answer on your behalf.
7. Say **Read my answer** to review the revision, then **Submit my revision**. Gemini generates the evidence card.
8. Say **Explain my evidence**. The guide reads the observations and supporting excerpts already displayed on the page.
9. Say **Share my evidence**, then **Yes, share it**. Sharing requires explicit confirmation and opens the recruiter preview. **Open recruiter view** also opens it once approved.
10. Say **Turn off microphone** when finished.

Commands accept common conversational variations, such as **Could you pick the engineering scenario?**, **Load an example answer**, **Save my revision**, and **Show me the recruiter preview**. The same matching applies to typed and spoken commands. Suggestions are examples, not required wording. Unfamiliar phrasing still uses the constrained Gemini interpreter.

**Go to sleep** waits for **Hi Gemini** again but keeps the microphone listening. **Turn off microphone** fully stops recognition and requires the button to re-enable it. **Cancel** or **No thanks** dismisses a pending confirmation. **Yes**, **Yes, confirm**, **I confirm**, or **Go ahead** confirms the pending action; **Yes, share it** also confirms sharing. An unrecognised reply keeps the confirmation pending so it can be repeated. Confirmations expire 60 seconds after the confirmation question finishes playing and become invalid if the draft or page changes. Scenario changes, draft replacement and restarting ask before discarding work. Spoken words during dictation are answer text, not navigation commands, apart from the explicit stop, sleep, microphone-off and finish controls.

The **Or type a command** field follows the same controller and provides a fallback for unsupported browsers and a way to inspect the workflow without microphone access. It is not evidence of completing the hands-free challenge.

Implementation: `public/voice.js` manages the panel, microphone and spoken playback; `public/voice-flow.js` manages the guided state transitions; `public/voice-intents.js` defines supported commands; `src/voice.mjs` constrains optional Gemini interpretation. The server applies the existing session, origin, concurrency and scenario checks. Typed and voice actions share the same application functions.
