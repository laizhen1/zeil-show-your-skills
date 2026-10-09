export const voiceActions = ['start', 'support', 'engineering', 'sample', 'type', 'record', 'append', 'read_scenario', 'read_reference', 'read_answer', 'read_followup', 'submit', 'evidence', 'share', 'recruiter', 'applicant', 'revise', 'reset', 'withdraw', 'repeat', 'help', 'sleep', 'off', 'stop', 'unknown'];

export const normalise = text => String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
// Strip conversational framing, but keep the entire request for intent matching.
export function commandWords(text) {
  return normalise(text)
    .replace(/^(?:(?:please|okay|ok|well) |(?:can|could|would|will) you (?:please )?|i (?:want|would like) to |i d like to )+/, '')
    .replace(/(?: please| for me| now| thanks| thank you)+$/, '')
    .replace(/^(?:please )/, '');
}

export function confirmationIntent(text, action) {
  const value = commandWords(text);
  if (/^(?:no|nope|cancel|never mind|nevermind|stop that|do not|don t)(?: (?:thanks|thank you|cancel|do that|share(?: it)?))?$/.test(value)) return 'cancel';
  if (/^(?:(?:yes|yeah|yep|sure|absolutely|okay|ok)(?: (?:please|confirm|confirmed|i confirm|go ahead|do it|that s right|that is correct|continue))?|confirm|confirmed|i confirm|go ahead|do it|proceed)$/.test(value)) return 'confirm';
  const specific = value.replace(/^(?:yes|yeah|yep|sure|okay|ok) /, '');
  if (action === 'share' && /^(?:share (?:it|that|my evidence|the evidence)(?: with (?:the )?recruiter)?|confirm (?:sharing|the share))$/.test(specific)) return 'confirm';
  if (['record', 'sample'].includes(action) && /^(?:replace (?:it|the draft|my answer))$/.test(specific)) return 'confirm';
  return 'unknown';
}
export function wakeCommand(text) {
  const match = String(text).match(/^\s*(?:hi|hey|hello)[,\s]+(?:gemini|genmini|gem mini)[,.!\s]*(.*)$/i);
  return match ? { command: match[1].trim() } : null;
}

// Whole-utterance matching prevents a quoted or negated command from taking action.
export function commandIntent(text) {
  const value = commandWords(text);
  const commands = {
    start: ['i want to write a response', 'start', 'start a work sample', 'write a response'],
    support: ['customer support', 'choose customer support', 'customer support specialist'],
    engineering: ['software engineering', 'software engineer', 'choose software engineering', 'choose software engineer'],
    sample: ['use the sample', 'use the sample response', 'use sample response', 'use the fictional sample', 'use the example', 'choose scenario example'],
    type: ['type', 'i will type', 'type my answer'],
    record: ['record my answer', 'dictate my answer', 'voice enter', 'record my response'],
    append: ['add to my answer', 'append to my answer'],
    read_scenario: ['read the scenario', 'read scenario'],
    read_reference: ['read the reference', 'read the policy', 'read the runbook'],
    read_answer: ['read my answer', 'read my response', 'read the sample'],
    read_followup: ['read the follow up', 'repeat the question'],
    submit: ['continue', 'submit my response', 'submit my revision', 'create my evidence', 'preview my evidence card'],
    evidence: ['explain my evidence', 'read my evidence', 'review my evidence', 'analysis page'],
    share: ['share my evidence', 'share with recruiter preview'],
    recruiter: ['open recruiter view', 'recruiter view'],
    applicant: ['open applicant view', 'applicant view', 'go back'],
    revise: ['revise my response', 'edit my answer'],
    reset: ['start a new attempt', 'start again'],
    withdraw: ['withdraw my evidence', 'withdraw from preview'],
    repeat: ['repeat that', 'repeat'], help: ['help', 'what can i say'],
    sleep: ['go to sleep', 'sleep'], off: ['turn off microphone', 'turn off the microphone', 'disable microphone'],
    stop: ['stop speaking', 'stop'],
  };
  const exact = Object.entries(commands).find(([, phrases]) => phrases.includes(value))?.[0];
  if (exact) return exact;
  const variants = {
    start: /^(?:begin|start|open|write)(?: (?:a|my|the|new))? (?:response|answer|work sample|conversation)$/,
    support: /^(?:(?:choose|select|pick|use|try|open) (?:the )?)?(?:customer )?support(?: (?:scenario|example))?$/,
    engineering: /^(?:(?:choose|select|pick|use|try|open) (?:the )?)?(?:software |technical )?engineering(?: (?:scenario|example))?$/,
    sample: /^(?:use|load|choose|select|pick|try)(?: (?:a|the|an))? (?:fictional |engineering |sample )?(?:sample|example)(?: (?:answer|response))?$|^(?:use|load|choose|select|pick) (?:the )?(?:sample|example) (?:answer|response)$/,
    type: /^(?:let me type|i will type (?:my )?(?:answer|response)|type (?:my )?response)$/,
    record: /^(?:record|dictate|speak) (?:an? |my |the )?(?:answer|response|revision)$|^(?:let me speak|use voice|start dictation)$/,
    append: /^(?:add|append)(?: more)? to (?:my |the )?(?:answer|response|revision)$/,
    read_scenario: /^(?:read|tell me|read out) (?:the |my )?(?:scenario|task)$/,
    read_reference: /^(?:read|read out|tell me) (?:the |my )?(?:reference|policy|runbook|instructions)$/,
    read_answer: /^(?:read|read back|read out) (?:my |the )?(?:answer|response|draft|revision|sample)$/,
    read_followup: /^(?:read|repeat|read out) (?:the |my )?(?:follow up|question)$/,
    submit: /^(?:submit|save|send) (?:my |the )?(?:answer|response|revision)$|^(?:next|next step|move on|carry on|keep going|create (?:my |the )?evidence(?: card)?)$/,
    evidence: /^(?:explain|show|review|read)(?: me)? (?:my |the )?(?:evidence|analysis|results)(?: card)?$/,
    share: /^(?:share|send) (?:my |the )?(?:evidence|evidence card|results)(?: with (?:the |a )?recruiter)?$|^share (?:it|this) with (?:the )?recruiter$/,
    recruiter: /^(?:open|show|go to|switch to)(?: me)? (?:the )?recruiter(?: (?:view|preview|page))?$/,
    applicant: /^(?:open|show|go to|switch to)(?: me)? (?:the )?(?:applicant|candidate)(?: (?:view|page))?$/,
    revise: /^(?:revise|edit|change|update) (?:my |the )?(?:answer|response|revision)$/,
    reset: /^(?:start over|restart|reset|new attempt|begin again|start a new (?:attempt|response))$/,
    withdraw: /^(?:withdraw|unshare|stop sharing) (?:my |the )?(?:evidence|evidence card|results)$/,
    repeat: /^(?:say (?:that|it) again|repeat (?:your answer|your reply|the last message))$/,
    help: /^(?:show (?:me )?(?:the )?commands|what can i (?:ask|do)|help me)$/,
    sleep: /^(?:wait|wait for (?:me|the wake phrase)|sleep mode|pause listening)$/,
    off: /^(?:disable|switch off|turn off|stop) (?:the |my )?(?:mic|microphone|voice|listening)$/,
    stop: /^(?:stop talking|be quiet|stop playback|stop reading)$/,
  };
  return Object.entries(variants).find(([, pattern]) => pattern.test(value))?.[0] || 'unknown';
}

export function dictatedPart(text) {
  const finished = /(?:^|\s)finish my answer[.!?\s]*$/i.test(text);
  return { finished, text: finished ? text.replace(/(?:^|\s)finish my answer[.!?\s]*$/i, '').trim() : text.trim() };
}
