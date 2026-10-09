import { VoiceFlow } from './voice-flow.js';
import { commandIntent } from './voice-intents.js';
import { MicrophoneMonitor } from './microphone.js';

export function initVoice(adapter) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const root = document.createElement('aside');
  root.className = 'voice-guide';
  root.setAttribute('aria-label', 'Voice guide');
  root.innerHTML = `<button class="mic-indicator" aria-label="Microphone status: off. Open voice controls."><span class="mic-light" aria-hidden="true"></span><span class="mic-indicator-label">Microphone off</span><meter class="mic-level" min="0" max="100" value="0" aria-label="Microphone input level"></meter></button><button class="voice-launcher" aria-expanded="false" aria-controls="voice-panel">Voice guide <span>Off</span></button>
    <section id="voice-panel" class="voice-panel" hidden><header><div><strong>Your voice guide</strong><p id="voice-status" role="status">Microphone off</p></div><button class="voice-close" aria-label="Minimise voice guide">&minus;</button></header>
    <div class="voice-controls">
      <div class="voice-control-hint"><button class="button" id="voice-microphone" aria-pressed="false" aria-describedby="mic-help">Enable microphone</button>
        <div class="voice-control-popover"><p id="mic-help">Enable voice, then say <strong>Hi Gemini</strong>. Chrome may send audio to its speech service, including while waiting for the wake phrase. Commands may be sent to Gemini. Use fictional information only.</p>
          <div class="mic-test-controls"><button class="text-button" id="mic-test">Test microphone</button><p id="mic-test-result" role="status">Test input locally before starting voice. No audio is recorded or sent by this test.</p></div>
        </div>
      </div>
      <div class="voice-control-hint"><button class="button secondary" id="voice-stop" aria-describedby="stop-help">Stop speaking</button>
        <div class="voice-control-popover"><p id="stop-help">Stop the guide’s spoken reply. This does not turn off the microphone. Use Turn off microphone to stop listening.</p><p>Browser speech with Gemini follow-up and evidence. Keep this tab active. Wait for Listening before speaking.</p></div>
      </div>
    </div>
    <div id="voice-chat" class="voice-chat" role="log" aria-label="Guide conversation" aria-live="polite"></div>
    <div class="voice-thinking" role="status" hidden><span aria-hidden="true"><i></i><i></i><i></i></span>Thinking</div>
    <p id="voice-interim" class="voice-interim"></p>
    <div class="voice-suggestions" aria-label="Suggested next commands"><p class="voice-suggestion-label">Suggested to ask next</p><p class="voice-suggestion-hint" aria-live="polite"></p><div class="voice-suggestion-options"></div><p class="voice-suggestion-tip">Say a suggestion, or click it to fill the message box.</p></div>
    <details class="voice-help"><summary>What can I say?</summary>
      <p>After enabling the microphone, follow this sequence. Wait for the guide to finish speaking before each command.</p>
      <ol>
        <li><strong>Wake the guide:</strong> “Hi Gemini”.</li>
        <li><strong>Start:</strong> “I want to write a response”.</li>
        <li><strong>Choose one:</strong> “Choose software engineering” or “Choose customer support”.</li>
        <li><strong>Hear the task:</strong> “Read the scenario”, then “Read the reference” if needed.</li>
        <li><strong>Enter an answer:</strong> “Use the sample response”, or “Record my answer”, speak your answer, then “Finish my answer”.</li>
        <li><strong>Check and submit:</strong> “Read my answer”, then “Continue”. The guide reads Gemini’s follow-up.</li>
        <li><strong>Revise:</strong> “Record my answer”, then “Yes, confirm” to replace the draft. Speak your revision, then “Finish my answer”. Use “Add to my answer” instead to keep and extend the draft.</li>
        <li><strong>Create evidence:</strong> “Read my answer”, then “Submit my revision”.</li>
        <li><strong>Review:</strong> “Explain my evidence”.</li>
        <li><strong>Share when ready:</strong> “Share my evidence”, then “Yes, share it”.</li>
        <li><strong>View as a recruiter:</strong> “Open recruiter view”.</li>
        <li><strong>Finish:</strong> “Turn off microphone”.</li>
      </ol>
      <p><strong>Other controls:</strong> “Repeat that”, “Stop speaking”, “Cancel” a confirmation, or “Go to sleep” to wait for “Hi Gemini” again. For an existing attempt, say “Start a new attempt”, then “Yes, confirm” to discard it.</p>
    </details>
    <form id="voice-command"><label for="voice-text">Or type a command</label><div><input id="voice-text" maxlength="600" autocomplete="off" placeholder="I want to write a response"><button class="button" type="submit">Send</button></div></form>
    </section>`;
  document.body.append(root);
  const $ = selector => root.querySelector(selector);
  const messages = [];
  let enabled = false, speaking = false, recognition = null, restarting = null, cooldown = 0, speechId = 0, settleSpeech = null;
  let suggestionKey = '';
  let testing = false, requestingMic = false, heardSound = false, testTimer = null, micAttempt = 0;
  const monitor = new MicrophoneMonitor({
    onLevel: (level, active) => {
      $('.mic-level').value = level;
      $('.mic-indicator').classList.toggle('sound-active', active);
      if (testing && active && !heardSound) {
        heardSound = true;
        $('#mic-test-result').textContent = 'Sound detected. Your microphone is receiving audio. This checks input level, not speech recognition.';
      }
    },
    onEnded: () => off('Microphone disconnected. Reconnect it and run Test microphone again.'),
  });
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
    $('#voice-microphone').disabled = requestingMic;
    $('#mic-test').disabled = requestingMic || enabled;
    $('#mic-test').textContent = testing ? 'Stop microphone test' : 'Test microphone';
    const micStatus = requestingMic ? 'Allow microphone access' : testing ? 'Testing microphone' : !enabled ? 'Microphone off' : speaking ? 'Guide speaking' : flow.busy || adapter.state().busy ? 'Preparing response' : flow.awake ? 'Listening' : 'Waiting for Hi Gemini';
    $('.mic-indicator-label').textContent = micStatus;
    $('.mic-indicator').setAttribute('aria-label', `${micStatus}. Open voice controls.`);
    $('.mic-indicator').classList.toggle('mic-on', enabled || testing);
    root.classList.toggle('voice-enabled', enabled);
    const working = !speaking && (flow.busy || adapter.state().busy);
    root.classList.toggle('voice-working', working);
    $('.voice-thinking').hidden = !working;
    const suggestions = enabled && !flow.awake
      ? { hint: 'Wake the guide when you are ready to talk.', commands: ['Hi Gemini'] }
      : flow.suggestions();
    const key = JSON.stringify(suggestions);
    $('.voice-suggestions').hidden = working || speaking || !suggestions.commands.length;
    if (key !== suggestionKey) {
      suggestionKey = key;
      $('.voice-suggestion-hint').textContent = suggestions.hint;
      $('.voice-suggestion-options').replaceChildren(...suggestions.commands.map(command => {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = command;
        button.onclick = () => { $('#voice-text').value = command; $('#voice-text').focus(); };
        return button;
      }));
    }
    $('.voice-suggestion-tip').textContent = enabled ? 'Say a suggestion, or click it to fill the message box.' : 'Enable the microphone to speak, or click a suggestion and press Send.';
  };
  const stopSpeech = () => {
    speechId++;
    window.speechSynthesis?.cancel();
    settleSpeech?.(); settleSpeech = null;
    speaking = false; cooldown = Date.now() + 600; update();
  };
  const off = (message = 'Microphone off. Click Enable microphone to use voice again.') => {
    micAttempt++; requestingMic = false; testing = false; clearTimeout(testTimer); monitor.stop();
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
  const micError = error => error.name === 'NotAllowedError' ? 'Microphone access was denied. Allow it in Chrome site settings and try again.' : error.name === 'NotFoundError' ? 'No microphone was found. Connect one and try again.' : error.name === 'NotReadableError' ? 'The microphone is unavailable or in use by another application.' : 'Microphone access failed. Check your device and browser permissions.';
  const testMicrophone = async () => {
    if (testing) { testing = false; clearTimeout(testTimer); monitor.stop(); update(); return; }
    const attempt = ++micAttempt;
    requestingMic = true; heardSound = false; update();
    try {
      if (!await monitor.start() || attempt !== micAttempt) return;
      testing = true;
      $('#mic-test-result').textContent = 'Speak or tap near your microphone. The top-right light and meter should react. The test stops after 15 seconds.';
      testTimer = setTimeout(() => {
        testing = false; monitor.stop();
        $('#mic-test-result').textContent = heardSound ? 'Test complete: sound detected. Select Enable microphone to start the voice guide.' : 'No sound detected. Check your mute switch, input volume and Chrome microphone selection, then test again.';
        update();
      }, 15000);
    } catch (error) { if (attempt === micAttempt) $('#mic-test-result').textContent = micError(error); }
    finally { if (attempt === micAttempt) { requestingMic = false; update(); } }
  };
  const enable = async () => {
    if (!Recognition || !window.speechSynthesis) { add('guide', 'Voice requires a supported desktop Chrome browser. You can still use the typed commands and normal controls.'); return; }
    const attempt = ++micAttempt;
    testing = false; clearTimeout(testTimer); requestingMic = true; update();
    try {
      if (!await monitor.start() || attempt !== micAttempt) return;
    } catch (error) { if (attempt === micAttempt) add('guide', micError(error)); return; }
    finally { if (attempt === micAttempt) { requestingMic = false; update(); } }
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
  root.querySelectorAll('.voice-control-hint').forEach(hint => {
    hint.addEventListener('keydown', event => { if (event.key === 'Escape') hint.classList.add('hint-dismissed'); });
    hint.addEventListener('mouseleave', () => hint.classList.remove('hint-dismissed'));
    hint.addEventListener('focusout', event => { if (!hint.contains(event.relatedTarget)) hint.classList.remove('hint-dismissed'); });
  });
  $('.mic-indicator').onclick = open;
  $('#mic-test').onclick = testMicrophone;
  $('#voice-microphone').onclick = () => enabled ? off() : enable();
  $('#voice-stop').onclick = stopSpeech;
  $('#voice-command').onsubmit = event => {
    event.preventDefault(); const input = $('#voice-text'); const text = input.value.trim();
    if (!text || flow.busy || adapter.state().busy) return;
    input.value = ''; stopSpeech(); void handle(text, true);
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden && (enabled || testing || requestingMic)) off('Microphone turned off because this tab is no longer active.'); });
  window.addEventListener('pagehide', () => { if (enabled || testing || requestingMic) off(); });
  add('guide', 'I can guide you from choosing a scenario to reviewing your evidence. Enable the microphone and say Hi Gemini, or type a command below.');
  update();
  return { open, update };
}
