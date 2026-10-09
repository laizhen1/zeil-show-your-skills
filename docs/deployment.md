# Public deployment verification

Verified 9 October 2026, approximately 11:44 NZ time.

- URL: https://zeil-show-your-skills.vercel.app/
- Vercel Hobby project connected to the private GitHub repository and production branch `main`.
- Later pushes were observed building and becoming the production deployment automatically.
- Gemini key configured as a sensitive server environment variable; never sent to the frontend.
- Private Vercel Blob store connected through project-scoped OIDC credentials.
- HTTPS session cookie is HttpOnly, Secure and SameSite=Strict.
- Strong storage reads and conditional writes preserve session state across server instances and reject conflicting updates. Reads request the uncompressed representation to preserve the stored ETag.

## Verification

The public API was accessed without Vercel authentication or browser login cookies. The complete real-model HTTP check passed with `gemini-3.8-flash`: grounded follow-up, four validated evidence criteria, exact source quotations, explicit approval, recruiter preview and withdrawal. No fixture model was used for this live check.

Thirteen deterministic engineering tests cover workflow validation, session isolation, expiry, stale updates and restoration across separate server instances. These tests do not count as the scored model-evaluation bonus.

## Demo limits

Use fictional responses only. This is a public hackathon demonstration, not a production hiring integration. A session permits twelve generation requests and expires after two hours. Private stored records remain until removed by the project owner. Sharing switches the perspective within that session; it does not deliver evidence to a real employer. Unsent edits are lost on reload.

The shared event Gemini key has limited lifetime and quota. Successful hosting does not extend that key's validity.

## Two-scenario update

On 9 October, the deployed application was extended with a software-engineering payment incident alongside the customer-support example. Both offer an editable sample or a blank applicant response. Selection is stored on the server and changes the reference rules, model context and evidence labels.

Seventeen deterministic tests pass, including the engineering workflow, scenario restoration, clearing previous evidence and approval, stale-tab rejection, an in-flight generation lock, and preserving the request limit across scenario changes. The production scenario selector was verified in the browser; the previous support evidence remained available after deployment.

Live engineering verification was attempted locally and on Vercel. Gemini returned a temporary HTTP 503 or timed out before producing a follow-up. The errors were surfaced without advancing the workflow. The new engineering path has therefore passed fixture-based integration checks, but its complete real-model verification remains pending provider availability. The earlier successful support verification above remains a historical result.

## Voice guide update

On 9 October, a persistent compact voice-guide panel was added with a purple processing indicator, microphone controls, wake-phrase gating, browser speech recognition and spoken readbacks. Common commands use a fixed controller; unfamiliar phrasing can use a server-side Gemini action classifier. The application confirms interpreted actions and separately explains destructive changes before confirmation. Gemini Live and Gemini audio input are not used.

Twenty-eight automated tests pass. New cases cover sleeping-state isolation, the complete command flow, dictation authorship, explicit sharing, replacement confirmation, stale and expired confirmations, invalid model actions, voice request limits, microphone-off invalidation, and page changes during dictation.

A browser test against the local server used the panel's typed-command fallback with real Gemini calls. The engineering sample produced a P1 follow-up, a fictional test revision produced four validated evidence observations, and explicit confirmation opened the recruiter preview with the correct revision. The purple processing indicator appeared during generation. This resolves the earlier local real-model engineering verification gap; it is not a microphone test or a new full production real-model test. The optional command classifier also returned a valid conservative unknown response to ambiguous phrasing.

Actual microphone recognition, speech playback and the complete hands-free recording still require a device rehearsal. Automated tests and typed-command verification must not be presented as evidence that the No hands challenge has been completed.
