import test from 'node:test';
import assert from 'node:assert/strict';
import { MemorySessions, sessionTtl } from '../src/sessions.mjs';
import { createApp } from '../src/server.mjs';

test('session writes reject stale updates and reads do not mutate saved state', async () => {
  const store = new MemorySessions();
  const version = await store.write('example', { created: Date.now(), approved: false });
  const first = await store.read('example');
  first.data.approved = true;
  assert.equal((await store.read('example')).data.approved, false);
  await store.write('example', first.data, version);
  await assert.rejects(store.write('example', { created: Date.now(), approved: false }, version), { status: 409 });
});

test('expired sessions cannot be restored', async () => {
  const store = new MemorySessions();
  await store.write('expired', { created: Date.now() - sessionTtl - 1 });
  assert.equal(await store.read('expired'), null);
});

test('separate server instances restore the same persisted session', async t => {
  const sessions = new MemorySessions();
  const apps = [createApp({ sessions }), createApp({ sessions })];
  for (const app of apps) {
    await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => app.close(resolve)));
  }
  const response = await fetch(`http://127.0.0.1:${apps[0].address().port}/api/session`);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const id = cookie.split('=')[1];
  const record = await sessions.read(id);
  record.data.initial = 'A response saved on another instance.';
  await sessions.write(id, record.data, record.version);
  const restored = await fetch(`http://127.0.0.1:${apps[1].address().port}/api/session`, { headers: { Cookie: cookie } });
  assert.equal((await restored.json()).state.initial, record.data.initial);
  assert.equal(restored.headers.get('set-cookie'), null);
});
