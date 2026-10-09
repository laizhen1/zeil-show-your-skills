import { VoiceFlow } from './voice-flow.js';
import { commandIntent } from './voice-intents.js';

export function initVoice(adapter) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const root = document.createElement('aside');
  root.className = 'voice-guide';
  root.setAttribute('aria-label', 'Voice guide');
  root.innerHTML = `<button class="voice-launcher" aria-expanded="false" aria-controls="voice-panel">Voice guide <span>Off</span></button>
    <section id="voice-panel" class="voice-panel" hidden><header><div><strong>Your voice guide</strong><p id="voice-status" role="status">Microphone off</p></div><button class="voice-close" aria-label="Minimise voice guide">&minus;</button></header>
    <div class="voice-privacy">Enable voice, then say <strong>Hi Gemini</strong>. Chrome may send audio to its speech service, including while waiting for the wake phrase. Commands may be sent to Gemini. Use fictional information only.</div>
    <div class="voice-controls"><button class="button" id="voice-microphone" aria-pressed="false">Enable microphone</button><button class="button secondary" id="voice-stop">Stop speaking</button></div>
    <div id="voice-chat" class="voice-chat" role="log" aria-label="Guide conversation" aria-live="polite"></div>
    <div class="voice-thinking" role="status" hidden><span aria-hidden="true"><i></i><i></i><i></i></span>Thinking</div>
    <p id="voice-interim" class="voice-interim"></p>
    <details class="voice-help"><summary>What can I say?</summary><p>Choose software engineering · Choose customer support · Read the scenario · Read the reference · Use the sample response · Record my answer · Add to my answer · Finish my answer · Read my answer · Continue · Explain my evidence · Share my evidence · Open recruiter view · Go to sleep · Turn off microphone</p></details>
    <form id="voice-command"><label for="voice-text">Or type a command</label><div><input id="voice-text" maxlength="600" autocomplete="off" placeholder="I want to write a response"><button class="button" type="submit">Send</button></div></form>
    <p class="voice-footnote">Browser speech with Gemini follow-up and evidence. Keep this tab active. Wait for Listening before speaking.</p></section>`;
  document.body.append(root);
  const $ = selector => root.querySelector(selector);
  const messages = [];
  let enabled = false, speaking = false, recognition = null, restarting = null, cooldown = 0, speechId = 0, settleSpeech = null;
  const add = (role, text) => {
    messages.push({ role, text });
    if (messages.length > 16) messages.shift();
    const log = $('#voice-chat');
    log.replaceChildren(...messages.map(message => {
      const row = document.createElement('p'); row.className = `voice-message ${message.role}`;
      const label = document.createElement('strong'); label.textContent = message.role === 'user' ? 'You' : 'Guide';
      const body = document.createElement('span'); body.textContent = message.text;
      row.append(label, body); return row;
    }));
    log.scrollTop = log.scrollHeight;
  };
  const update = () => {
    const status = !enabled ? 'Microphone off' : speaking ? 'Speaking · say “stop speaking” to interrupt' : flow.busy || adapter.state().busy ? 'Working · please wait' : flow.dictating ? 'Listening · dictating your answer' : flow.pending ? 'Listening · waiting for confirmation' : flow.awake ? 'Listening · say a command' : 'Waiting for “Hi Gemini”';
    $('#voice-status').textContent = status;
    $('.voice-launcher span').textContent = !enabled ? 'Off' : speaking ? 'Speaking' : flow.dictating ? 'Dictating' : 'On';
    $('#voice-microphone').textContent = enabled ? 'Turn off microphone' : 'Enable microphone';
    $('#voice-microphone').setAttribute('aria-pressed', String(enabled));
    root.classList.toggle('voice-enabled', enabled);
    const working = !speaking && (flow.busy || adapter.state().busy);
    root.classList.toggle('voice-working', working);
    $('.voice-thinking').hidden = !working;
  };
  const stopSpeech = () => {
    speechId++;
    window.speechSynthesis?.cancel();
    settleSpeech?.(); settleSpeech = null;
    speaking = false; cooldown = Date.now() + 600; update();
  };
  const off = (message = 'Microphone off. Click Enable microphone to use voice again.') => {
    enabled = false; clearTimeout(restarting); recognition?.abort(); recognition = null;
    stopSpeech(); flow.sleep(); $('#voice-interim').textContent = ''; add('guide', message); update();
  };
  async function say(text) {
    add('guide', text);
    if (!enabled || !window.speechSynthesis) return;
    stopSpeech();
    const id = speechId;
    speaking = true; update();
    // Short utterances avoid long-speech stalls in desktop Chrome.
    const chunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    for (const sentence of chunks) {
      const parts = sentence.match(/.{1,180}(?:\s|$)|\S{1,180}/g) || [sentence];
      for (const part of parts) {
        if (!enabled || id !== speechId) return;
        await new Promise(resolve => {
          const utterance = new SpeechSynthesisUtterance(part.trim());
          utterance.lang = 'en-NZ'; utterance.rate = 1;
          const voice = speechSynthesis.getVoices().find(v => v.lang === 'en-NZ') || speechSynthesis.getVoices().find(v => v.lang.startsWith('en-'));
          if (voice) utterance.voice = voice;
          let timer;
          const done = () => { clearTimeout(timer); if (settleSpeech === done) settleSpeech = null; resolve(); };
          settleSpeech = done;
          utterance.onend = done;
          utterance.onerror = done;
          timer = setTimeout(() => { speechSynthesis.cancel(); done(); }, 20000);
          speechSynthesis.speak(utterance);
        });
      }
    }
    if (id === speechId) { speaking = false; cooldown = Date.now() + 600; update(); }
  }
  const flow = new VoiceFlow({ ...adapter, say, off, stop: stopSpeech, update });
  const handle = async (text, manual = false) => {
    if (!manual && (speaking || Date.now() < cooldown)) {
      if (commandIntent(text) === 'off') off();
      else if (commandIntent(text) === 'stop') stopSpeech();
      return;
    }
    if (flow.awake || manual || /^(hi|hey|hello)\b/i.test(text)) add('user', text);
    await flow.hear(text, { manual }); update();
  };
  const enable = () => {
    if (!Recognition || !window.speechSynthesis) { add('guide', 'Voice requires a supported desktop Chrome browser. You can still use the typed commands and normal controls.'); return; }
    enabled = true; flow.sleep();
    const engine = new Recognition(); recognition = engine;
    engine.lang = 'en-NZ'; engine.continuous = true; engine.interimResults = true;
    engine.onstart = update;
    engine.onresult = event => {
      if (!enabled || engine !== recognition) return;
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) void handle(result[0].transcript);
        else if (flow.awake && !speaking) interim += result[0].transcript;
      }
      $('#voice-interim').textContent = interim ? `Hearing: ${interim}` : '';
    };
    engine.onerror = event => {
      if (engine !== recognition || !enabled) return;
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone permission was denied. Allow microphone access in Chrome site settings, then enable voice again.'
        : event.error === 'audio-capture' ? 'No microphone is available. Connect a microphone and enable voice again.'
        : 'Speech recognition disconnected. Check your connection and enable voice again. Your draft is preserved.';
      off(message);
    };
    engine.onend = () => {
      if (!enabled || engine !== recognition) return;
      restarting = setTimeout(() => { if (enabled && engine === recognition) { try { engine.start(); } catch { off('Voice could not restart. Please enable the microphone again.'); } } }, 300);
    };
    try { engine.start(); void say('Voice mode enabled. When I finish speaking, say Hi Gemini to begin.'); }
    catch { off('Voice could not start. Check microphone permission and try again.'); }
    update();
  };
  const open = () => { $('#voice-panel').hidden = false; $('.voice-launcher').setAttribute('aria-expanded', 'true'); };
  $('.voice-launcher').onclick = () => { $('#voice-panel').hidden ? open() : minimise(); };
  const minimise = () => { $('#voice-panel').hidden = true; $('.voice-launcher').setAttribute('aria-expanded', 'false'); };
  $('.voice-close').onclick = minimise;
  $('#voice-microphone').onclick = () => enabled ? off() : enable();
  $('#voice-stop').onclick = stopSpeech;
  $('#voice-command').onsubmit = event => {
    event.preventDefault(); const input = $('#voice-text'); const text = input.value.trim();
    if (!text || flow.busy || adapter.state().busy) return;
    input.value = ''; stopSpeech(); void handle(text, true);
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden && enabled) off('Microphone turned off because this tab is no longer active.'); });
  window.addEventListener('pagehide', () => { if (enabled) off(); });
  add('guide', 'I can guide you from choosing a scenario to reviewing your evidence. Enable the microphone and say Hi Gemini, or type a command below.');
  update();
  return { open, update };
}
