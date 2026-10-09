import { commandIntent, dictatedPart, normalise, wakeCommand } from './voice-intents.js';

export class VoiceFlow {
  constructor(adapter) {
    this.app = adapter;
    this.awake = false;
    this.dictating = false;
    this.pending = null;
    this.busy = false;
    this.lastReply = '';
    this.epoch = 0;
  }
  snapshot() {
    const s = this.app.state();
    return JSON.stringify([s.scenario.id, s.initial, s.revision, !!s.followup, !!s.evidence, s.approved, s.view]);
  }
  async say(text) {
    this.lastReply = text;
    this.app.update();
    await this.app.say(text);
  }
  sleep() { this.epoch++; this.awake = false; this.dictating = false; this.pending = null; this.app.update(); }
  ask(action, message, confirmed = true) {
    this.pending = { action, confirmed, snapshot: this.snapshot(), expires: Date.now() + 30000 };
    return this.say(`${message} Say "yes, confirm" or "cancel".`);
  }
  async hear(raw, { manual = false } = {}) {
    let text = String(raw).trim();
    if (!text) return;
    const wake = wakeCommand(text);
    if (!this.awake && !manual && !wake && commandIntent(text) !== 'off') return;
    if (wake) text = wake.command;
    if (wake || manual) this.awake = true;
    const command = commandIntent(text);
    if (command === 'off') { this.sleep(); this.app.off(); return; }
    if (command === 'sleep') { this.sleep(); return this.say('I will wait for Hi Gemini. The microphone is still listening for that phrase.'); }
    if (command === 'stop') { this.app.stop(); return; }
    if (this.busy || this.app.state().busy) return;
    if (this.dictating) {
      const currentState = this.app.state();
      if (this.dictationContext !== `${currentState.scenario.id}:${!!currentState.followup}:${currentState.view}` || currentState.evidence) {
        this.dictating = false;
        return this.say('The page changed, so dictation stopped. Say record my answer when you are ready.');
      }
      const part = dictatedPart(text);
      if (part.text) {
        const s = this.app.state();
        const current = s.followup ? s.revision : s.initial;
        const next = [current, part.text].filter(Boolean).join(' ');
        if (next.length > 5000) { this.dictating = false; return this.say('The answer is at the 5,000 character limit. Your existing draft is preserved.'); }
        this.app.draft(next);
      }
      if (part.finished) {
        this.dictating = false;
        await this.say('Your draft is ready. Say read my answer to check it, record my answer to replace it, or continue to submit it.');
      }
      this.app.update();
      return;
    }
    if (!text) return this.say('Hi. I can guide your work sample. Say I want to write a response, or review my evidence.');
    if (this.pending) {
      const pending = this.pending;
      this.pending = null;
      if (['cancel', 'no', 'no cancel'].includes(normalise(text))) return this.say('Cancelled. Nothing was changed.');
      if (!['yes confirm', 'yes share it', 'yes replace it', 'yes continue'].includes(normalise(text))) return this.say('Nothing was changed. Please repeat the action you want.');
      if (pending.expires < Date.now() || pending.snapshot !== this.snapshot()) return this.say('The confirmation expired or the page changed. Please request the action again.');
      return this.run(pending.action, pending.confirmed);
    }
    if (['yes confirm', 'yes share it', 'yes replace it', 'yes continue', 'cancel'].includes(normalise(text))) return this.say('There is no action waiting for confirmation.');
    if (command !== 'unknown') return this.run(command);
    this.busy = true; this.app.update();
    const epoch = this.epoch;
    const snapshot = this.snapshot();
    try {
      const action = await this.app.interpret(text);
      if (epoch !== this.epoch || snapshot !== this.snapshot()) return;
      if (action === 'unknown') return await this.say('I did not recognise that command. Say help for the supported commands.');
      // A model interpretation never authorises a mutation on its own.
      await this.ask(action, `I understood "${action.replaceAll('_', ' ')}". Is that what you want?`, false);
    } catch { if (epoch === this.epoch) await this.say('I could not interpret that phrasing. Please use a command shown in the panel. Your work is preserved.'); }
    finally { this.busy = false; this.app.update(); }
  }
  async run(action, confirmed = false) {
    const s = this.app.state();
    if (action === 'repeat') return this.say(this.lastReply || 'Say help to hear the available commands.');
    if (action === 'help') return this.say('Say choose software engineering, choose customer support, use the sample response, record my answer, read my answer, continue, explain my evidence, or share my evidence. During dictation, say finish my answer to stop.');
    if (action === 'off') { this.sleep(); return this.app.off(); }
    if (action === 'sleep') { this.sleep(); return this.say('Waiting for Hi Gemini.'); }
    if (action === 'stop') return this.app.stop();
    if (action === 'start') {
      await this.app.action('applicant');
      if (s.evidence) return this.say('Your evidence is ready. Say explain my evidence, revise my response, or start a new attempt.');
      if (s.followup) return this.say(`Your follow-up is: ${s.followup.question} Say record my answer to revise it.`);
      return this.say('Choose customer support or software engineering. Then you can type, dictate your answer, or use a fictional sample.');
    }
    if (action === 'read_scenario') return this.say(`${s.scenario.title}. ${s.scenario.message} ${s.scenario.task}`);
    if (action === 'read_reference') return this.say(s.scenario.policies.map(p => `${p.id}. ${p.title}. ${p.text}`).join(' '));
    if (action === 'read_answer') return this.say((s.followup ? s.revision : s.initial) || 'There is no draft yet.');
    if (action === 'read_followup') return this.say(s.followup?.question || 'Submit your first response to receive a follow-up.');
    if (action === 'evidence') {
      if (!s.evidence) return this.say('Complete your response and revision to create an evidence card.');
      await this.app.action('applicant');
      return this.say(s.evidence.observations.map(o => `${s.scenario.criteria.find(c => c.id === o.criterion)?.label || o.criterion}: ${o.observation}${o.quote ? ` Your ${o.source} response says: ${o.quote}` : ''}`).join(' ') + ' These observations describe this work sample only. Say share my evidence when you are ready.');
    }
    if (['record', 'append', 'type', 'sample'].includes(action) && (s.evidence || s.view === 'recruiter')) return this.say('Say revise my response to reopen the answer before editing.');
    if (action === 'type') { this.app.focus(); return this.say('The answer field is ready. Type your answer, then say continue.'); }
    if (action === 'record' || action === 'append') {
      if (action === 'record' && (s.followup ? s.revision : s.initial) && !confirmed) return this.ask(action, 'Replace the current draft with a new dictated answer?');
      if (action === 'record') this.app.draft('');
      this.dictating = true;
      this.dictationContext = `${s.scenario.id}:${!!s.followup}:${s.view}`;
      this.app.focus();
      return this.say('Dictation starts after I finish speaking. Say your answer, then finish my answer. Nothing is submitted automatically.');
    }
    if (action === 'sample' && s.followup) return this.say('The sample is for the original response. The revision must be your own. Say record my answer.');
    if (action === 'share' && !s.evidence) return this.say('Prepare and review your evidence card first.');
    if (action === 'recruiter' && !s.approved) return this.say('Your evidence is private. Say share my evidence first.');
    if (action === 'revise' && !s.evidence) return this.say('You are already on the response screen.');
    if (action === 'submit' && s.evidence) return this.say('Your evidence is already prepared. Say explain my evidence or share my evidence.');
    if (action === 'submit' && (s.followup ? s.revision : s.initial).trim().length < 40) return this.say('Your answer needs at least 40 characters. Say record my answer or use the sample response.');
    if (!confirmed) {
      if (action === 'share') return this.ask(action, 'Share the evidence card and both responses with the recruiter preview?');
      if (action === 'reset') return this.ask(action, 'Start again and discard the current answers, evidence and sharing approval?');
      if (action === 'revise' && s.approved) return this.ask(action, 'Revising will withdraw the shared evidence. Continue?');
      if (action === 'sample' && s.initial) return this.ask(action, 'Replace the current draft with the fictional sample?');
      if (['support', 'engineering'].includes(action) && (s.initial || s.followup || s.evidence)) return this.ask(action, 'Change scenario and discard the current answers, evidence and sharing approval?');
    }
    this.busy = true; this.app.update();
    const epoch = this.epoch;
    try {
      const mapping = { support: 'scenario', engineering: 'scenario', withdraw: 'unshare' };
      if (action === 'submit') await this.say(s.followup ? 'Preparing your evidence card.' : 'Preparing your follow-up.');
      // The user may disable voice during the spoken acknowledgement.
      if (epoch !== this.epoch) return;
      await this.app.action(mapping[action] || action, action);
      if (epoch !== this.epoch) return;
      const next = this.app.state();
      if (next.error) return await this.say(next.error);
      const messages = {
        support: 'Customer support selected. You can type, record your answer, use the sample response, or read the scenario.',
        engineering: 'Software engineering selected. You can type, record your answer, use the sample response, or read the scenario.',
        sample: 'Fictional sample loaded. It deliberately contains a conflict with the reference. Say read my answer or continue.',
        share: 'Shared with the recruiter preview. No employer has been contacted. Say explain my evidence to hear it.',
        recruiter: 'Recruiter view is open. Say explain my evidence to hear the observations.',
        applicant: 'Applicant view is open.', revise: 'Your revision is open. Say record my answer or add to my answer.',
        reset: 'A new attempt is ready. Choose customer support or software engineering.', withdraw: 'Your evidence has been withdrawn from the recruiter preview.',
      };
      await this.say(action === 'submit' ? next.evidence ? 'Your evidence card is ready. Say explain my evidence to review it. Nothing is shared yet.' : `${next.followup.question} Say record my answer to replace the draft, or add to my answer.` : messages[action] || 'Say help for the supported commands.');
    } catch { if (epoch === this.epoch) await this.say('That action could not finish. Your current page is preserved. Please try again.'); }
    finally { this.busy = false; this.app.update(); }
  }
}
