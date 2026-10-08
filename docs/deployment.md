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
