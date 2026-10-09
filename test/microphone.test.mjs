import test from 'node:test';
import assert from 'node:assert/strict';
import { MicrophoneMonitor } from '../public/microphone.js';

function fixture() {
  const track = { stopped: 0, stop() { this.stopped++; } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const closed = [];
  class Audio {
    async resume() {}
    async close() { closed.push(true); }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() { return { getFloatTimeDomainData(array) { array.fill(0); } }; }
  }
  return { track, stream, Audio, closed };
}

test('microphone test releases the input and audio context on stop', async () => {
  const f = fixture();
  const levels = [];
  const monitor = new MicrophoneMonitor({ media: { getUserMedia: async () => f.stream }, Audio: f.Audio, onLevel: value => levels.push(value), onEnded() {} });
  assert.equal(await monitor.start(), true);
  monitor.stop();
  assert.equal(f.track.stopped, 1);
  assert.equal(f.closed.length, 1);
  assert.equal(levels.at(-1), 0);
});

test('a permission result arriving after cancellation cannot leave the microphone on', async () => {
  const f = fixture();
  let resolve;
  const monitor = new MicrophoneMonitor({ media: { getUserMedia: () => new Promise(r => { resolve = r; }) }, Audio: f.Audio, onLevel() {}, onEnded() {} });
  const pending = monitor.start();
  monitor.stop();
  resolve(f.stream);
  assert.equal(await pending, false);
  assert.equal(f.track.stopped, 1);
  assert.equal(monitor.stream, null);
});

test('device removal releases resources and notifies the guide', async () => {
  const f = fixture(); let ended = false;
  const monitor = new MicrophoneMonitor({ media: { getUserMedia: async () => f.stream }, Audio: f.Audio, onLevel() {}, onEnded() { ended = true; } });
  await monitor.start(); f.track.onended();
  assert.equal(ended, true);
  assert.equal(f.track.stopped, 1);
  assert.equal(f.closed.length, 1);
});
