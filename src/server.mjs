import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { generateStructured } from './gemini.mjs';
import { scenario } from './scenario.mjs';
import { followupSchema, evidenceSchema, validateFollowup, validateEvidence } from './schemas.mjs';
import { systemInstruction, followupPrompt, evidencePrompt } from './prompts.mjs';

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

export function createApp({ generate = generateStructured } = {}) {
  const sessions = new Map();
  const ttl = 2 * 60 * 60 * 1000;
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
      const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!hosts.includes(req.headers.host)) throw bad(403, 'Unrecognised host. Open the local app URL.');
      if (req.headers.origin && !hosts.map(host => `http://${host}`).includes(req.headers.origin)) throw bad(403, 'This request must come from the app.');
      const path = new URL(req.url, `http://${req.headers.host}`).pathname;
      if (req.method === 'GET' && staticFiles.has(path)) {
        const [file, type] = staticFiles.get(path);
        res.writeHead(200, { 'Content-Type': type });
        return res.end(await readFile(new URL(`../public/${file}`, import.meta.url)));
      }
      if (!path.startsWith('/api/')) return send(404, { error: 'Not found.' });
      for (const [id, session] of sessions) if (Date.now() - session.created > ttl) sessions.delete(id);
      const cookie = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('zeil_session='))?.slice(13);
      let session = sessions.get(cookie);
      if (req.method === 'GET' && path === '/api/session') {
        if (!session) {
          if (sessions.size >= 100) throw bad(503, 'Demo capacity reached. Please try again later.');
          const id = randomBytes(24).toString('hex');
          session = { created: Date.now(), calls: 0, busy: false, initial: '', revision: '', followup: null, evidence: null, approved: false };
          sessions.set(id, session);
          res.setHeader('Set-Cookie', `zeil_session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200`);
        }
        return send(200, { scenario, state: { initial: session.initial, revision: session.revision, followup: session.followup, evidence: session.evidence, approved: session.approved, model: session.model } });
      }
      if (!session) throw bad(401, 'Your demo session expired. Reload the page to start again.');
      if (req.method === 'GET' && path === '/api/recruiter') {
        if (!session.approved) throw bad(403, 'The applicant has not shared this evidence card.');
        return send(200, { initial: session.initial, revision: session.revision, followup: session.followup, evidence: session.evidence, model: session.model });
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
      if (session.busy) throw bad(409, 'A response is already being prepared. Please wait.');
      if (path === '/api/reset') {
        Object.assign(session, { initial: '', revision: '', followup: null, evidence: null, approved: false });
        return send(200, { reset: true });
      }
      if (path === '/api/share') {
        if (!session.evidence) throw bad(409, 'Prepare and preview your evidence card first.');
        session.approved = true;
        return send(200, { approved: true });
      }
      if (path === '/api/unshare') { session.approved = false; return send(200, { approved: false }); }
      if (path === '/api/revise') { session.approved = false; session.evidence = null; return send(200, { approved: false }); }
      if (!['/api/followup', '/api/evidence'].includes(path)) throw bad(404, 'Not found.');
      if (session.calls >= 12) throw bad(429, 'This demo session has reached its AI request limit. Please return later.');
      if (path === '/api/followup' && session.followup) throw bad(409, 'A follow-up already exists. Start a new attempt to change the original answer.');
      if (path === '/api/evidence' && !session.followup) throw bad(409, 'Complete the first response before preparing evidence.');
      const answer = checkedAnswer(path === '/api/followup' ? body.answer : body.revision);
      session.busy = true;
      session.calls++;
      try {
        if (path === '/api/followup') {
          const result = await generate(followupPrompt(answer), followupSchema, systemInstruction);
          if (!validateFollowup(result.data, answer)) throw bad(502, 'The follow-up did not pass our evidence checks. Your answer is preserved; please try again.');
          Object.assign(session, { initial: answer, followup: result.data, model: result.model });
          return send(200, { followup: result.data });
        }
        const result = await generate(evidencePrompt(session.initial, session.followup, answer), evidenceSchema, systemInstruction);
        if (!validateEvidence(result.data, session.initial, answer)) throw bad(502, 'The evidence card contained invalid or unsupported excerpts. Nothing was shared. Your response is preserved; please try again.');
        Object.assign(session, { revision: answer, evidence: result.data, model: result.model, approved: false });
        return send(200, { evidence: result.data, model: result.model });
      } catch (error) {
        if (error.status) throw error;
        // Only return the controlled messages from our own API wrapper, never raw upstream content.
        const safe = /^(Gemini HTTP \d{3}\.|Gemini connection failed|The AI returned an unreadable|Gemini returned no text|Set GEMINI_API_KEY)/.test(error.message);
        throw bad(502, safe ? error.message : 'The AI service could not prepare a response. Your text is preserved; please try again.');
      } finally { session.busy = false; }
    } catch (error) {
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
