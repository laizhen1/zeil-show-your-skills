import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { generateStructured } from './gemini.mjs';
import { scenario, getScenario, scenarioOptions } from './scenario.mjs';
import { followupSchema, evidenceSchema, validateFollowup, validateEvidence } from './schemas.mjs';
import { systemInstruction, followupPrompt, evidencePrompt } from './prompts.mjs';
import { deploymentSessions } from './sessions.mjs';

const staticFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/assets/zeil-logo.png', ['assets/zeil-logo.png', 'image/png']],
  ['/assets/basel-book.otf', ['assets/basel-book.otf', 'font/otf']],
  ['/assets/basel-medium.otf', ['assets/basel-medium.otf', 'font/otf']],
  ['/assets/basel-bold.otf', ['assets/basel-bold.otf', 'font/otf']],
]);
const bad = (status, message) => Object.assign(new Error(message), { status });
const checkedAnswer = value => {
  if (typeof value !== 'string' || value.trim().length < 40 || value.length > 5000) throw bad(400, 'Please write between 40 and 5,000 characters.');
  return value.trim();
};

export function createApp({ generate = generateStructured, sessions = deploymentSessions() } = {}) {
  const server = http.createServer(async (req, res) => {
    const send = (status, payload) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(payload));
    };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const port = server.address()?.port;
      const hosts = process.env.VERCEL
        ? [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL].filter(Boolean)
        : [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!hosts.includes(req.headers.host)) throw bad(403, 'Unrecognised application host.');
      const protocol = process.env.VERCEL ? 'https' : 'http';
      if (req.headers.origin && req.headers.origin !== `${protocol}://${req.headers.host}`) throw bad(403, 'This request must come from the app.');
      const path = new URL(req.url, `http://${req.headers.host}`).pathname;
      if (req.method === 'GET' && staticFiles.has(path)) {
        const [file, type] = staticFiles.get(path);
        res.writeHead(200, { 'Content-Type': type });
        return res.end(await readFile(new URL(`../public/${file}`, import.meta.url)));
      }
      if (!path.startsWith('/api/')) return send(404, { error: 'Not found.' });
      const cookie = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('zeil_session='))?.slice(13);
      const record = await sessions.read(cookie);
      let session = record?.data;
      let version = record?.version;
      const save = async () => { version = await sessions.write(cookie, session, version); };
      if (req.method === 'GET' && path === '/api/session') {
        if (!session) {
          const id = randomBytes(24).toString('hex');
          session = { created: Date.now(), calls: 0, busy: false, initial: '', revision: '', followup: null, evidence: null, approved: false };
          await sessions.write(id, session);
          res.setHeader('Set-Cookie', `zeil_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200${process.env.VERCEL ? '; Secure' : ''}`);
        }
        return send(200, { scenario: getScenario(session.scenarioId) || scenario, scenarios: scenarioOptions, state: { initial: session.initial, revision: session.revision, followup: session.followup, evidence: session.evidence, approved: session.approved, model: session.model } });
      }
      if (!session) throw bad(401, 'Your demo session expired. Reload the page to start again.');
      const selectedScenario = getScenario(session.scenarioId) || scenario;
      if (req.method === 'GET' && path === '/api/recruiter') {
        if (!session.approved) throw bad(403, 'The applicant has not shared this evidence card.');
        return send(200, { scenario: selectedScenario, initial: session.initial, revision: session.revision, followup: session.followup, evidence: session.evidence, model: session.model });
      }
      if (req.method !== 'POST') throw bad(405, 'Method not allowed.');
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw bad(415, 'Send a JSON request.');
      let raw = '';
      req.setEncoding('utf8');
      for await (const chunk of req) {
        raw += chunk.toString('utf8');
        if (Buffer.byteLength(raw) > 24_000) throw bad(413, 'This response is too large. Please shorten it.');
      }
      let body;
      try { body = JSON.parse(raw); } catch { throw bad(400, 'The request could not be read. Please try again.'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad(400, 'Invalid request.');
      if (session.busy && Date.now() - session.busy < 180_000) throw bad(409, 'A response is already being prepared. Please wait.');
      if (path === '/api/scenario') {
        const next = getScenario(body.scenarioId);
        if (!next) throw bad(400, 'Choose one of the available scenarios.');
        Object.assign(session, { scenarioId: next.id, initial: '', revision: '', followup: null, evidence: null, approved: false, model: '' });
        await save();
        return send(200, { scenario: next });
      }
      if (path === '/api/reset') {
        Object.assign(session, { initial: '', revision: '', followup: null, evidence: null, approved: false });
        await save();
        return send(200, { reset: true });
      }
      if (path === '/api/share') {
        if (!session.evidence) throw bad(409, 'Prepare and preview your evidence card first.');
        session.approved = true;
        await save();
        return send(200, { approved: true });
      }
      if (path === '/api/unshare') { session.approved = false; await save(); return send(200, { approved: false }); }
      if (path === '/api/revise') { session.approved = false; session.evidence = null; await save(); return send(200, { approved: false }); }
      if (!['/api/followup', '/api/evidence'].includes(path)) throw bad(404, 'Not found.');
      if (body.scenarioId !== undefined && body.scenarioId !== selectedScenario.id) throw bad(409, 'The scenario changed in another tab. Reload before continuing.');
      if (session.calls >= 12) throw bad(429, 'This demo session has reached its AI request limit. Please return later.');
      if (path === '/api/followup' && session.followup) throw bad(409, 'A follow-up already exists. Start a new attempt to change the original answer.');
      if (path === '/api/evidence' && !session.followup) throw bad(409, 'Complete the first response before preparing evidence.');
      const answer = checkedAnswer(path === '/api/followup' ? body.answer : body.revision);
      session.busy = Date.now();
      session.calls++;
      await save();
      let payload;
      try {
        if (path === '/api/followup') {
          const result = await generate(followupPrompt(answer, selectedScenario), followupSchema, systemInstruction);
          if (!validateFollowup(result.data, answer)) throw bad(502, 'The follow-up did not pass our evidence checks. Your answer is preserved; please try again.');
          Object.assign(session, { initial: answer, followup: result.data, model: result.model });
          payload = { followup: result.data };
        } else {
        const result = await generate(evidencePrompt(session.initial, session.followup, answer, selectedScenario), evidenceSchema, systemInstruction);
        if (!validateEvidence(result.data, session.initial, answer)) throw bad(502, 'The evidence card contained invalid or unsupported excerpts. Nothing was shared. Your response is preserved; please try again.');
        Object.assign(session, { revision: answer, evidence: result.data, model: result.model, approved: false });
        payload = { evidence: result.data, model: result.model };
        }
      } catch (error) {
        if (error.status) throw error;
        // Only return the controlled messages from our own API wrapper, never raw upstream content.
        const safe = /^(Gemini HTTP \d{3}\.|Gemini connection failed|The AI returned an unreadable|Gemini returned no text|Set GEMINI_API_KEY)/.test(error.message);
        throw bad(502, safe ? error.message : 'The AI service could not prepare a response. Your text is preserved; please try again.');
      } finally { session.busy = false; await save(); }
      return send(200, payload);
    } catch (error) {
      // Log only the error class and controlled status, never answers, tokens or provider bodies.
      console.error('Request failed', { type: error.constructor.name, status: error.status || 500 });
      if (!res.headersSent) send(error.status || 500, { error: error.status ? error.message : 'Something went wrong. Please try again.' });
      else res.end();
    }
  });
  server.requestTimeout = 180_000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4173);
  const app = createApp();
  app.listen(port, '127.0.0.1', () => console.log(`Show Your Skills running at http://127.0.0.1:${port}`));
  app.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use.` : 'Could not start the server.'); process.exitCode = 1; });
}
