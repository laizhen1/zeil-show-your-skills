export const voiceActions = ['start', 'support', 'engineering', 'sample', 'type', 'record', 'append', 'read_scenario', 'read_reference', 'read_answer', 'read_followup', 'submit', 'evidence', 'share', 'recruiter', 'applicant', 'revise', 'reset', 'withdraw', 'repeat', 'help', 'sleep', 'off', 'stop', 'unknown'];

export const normalise = text => String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
export function wakeCommand(text) {
  const match = String(text).match(/^\s*(?:hi|hey|hello)[,\s]+(?:gemini|genmini|gem mini)[,.!\s]*(.*)$/i);
  return match ? { command: match[1].trim() } : null;
}

// Whole-utterance matching prevents a quoted or negated command from taking action.
export function commandIntent(text) {
  const value = normalise(text).replace(/^please /, '').replace(/ please$/, '');
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
  return Object.entries(commands).find(([, phrases]) => phrases.includes(value))?.[0] || 'unknown';
}

export function dictatedPart(text) {
  const finished = /(?:^|\s)finish my answer[.!?\s]*$/i.test(text);
  return { finished, text: finished ? text.replace(/(?:^|\s)finish my answer[.!?\s]*$/i, '').trim() : text.trim() };
}
