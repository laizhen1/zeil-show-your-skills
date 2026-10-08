const app = document.querySelector('#app');
const state = { scenario: null, scenarios: [], initial: '', revision: '', followup: null, evidence: null, approved: false, view: 'applicant', busy: false, error: '', model: '', sampleUsed: false };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const e = escapeHtml;
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${({ arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>', lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>', book: '<path d="M3 4h6a4 4 0 0 1 3 1.5A4 4 0 0 1 15 4h6v15h-6a4 4 0 0 0-3 1.5A4 4 0 0 0 9 19H3zM12 6v14"/>', check: '<path d="m5 12 4 4L19 6"/>', document: '<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/>' })[name]}</svg>`;
const errorHtml = () => state.error ? `<div class="error" role="alert"><p>${e(state.error)}</p></div>` : '';
const loadingHtml = message => state.busy ? `<div class="loading" role="status"><span class="spinner"></span><span>${e(message)} Your text stays here while we work.</span></div>` : '';

async function request(path, body) {
  const response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenarioId: state.scenario?.id, ...body }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request could not be completed. Please try again.');
  return data;
}

function shell(content, stage) {
  const recruiter = state.view === 'recruiter';
  return `<aside class="side-rail"><img class="zeil-logo" src="/assets/zeil-logo.png" alt="ZEIL"><nav aria-label="Application navigation"><button class="rail-item ${!recruiter ? 'selected' : ''}" data-action="applicant"><span>${icon('document')}</span>Application</button><button class="rail-item ${recruiter ? 'selected' : ''}" data-action="recruiter" ${!state.approved || state.busy ? 'disabled' : ''}><span>${icon('check')}</span>Evidence</button><a class="rail-item" href="#policy-P1"><span>${icon('book')}</span>Policy</a></nav><span class="profile-circle" aria-label="Demo profile">JL</span></aside><div class="app-frame"><header class="topbar"><div class="brand-group"><div><span class="breadcrumb">My applications <span>/</span></span><span class="product-name">Show Your Skills</span></div></div><nav class="view-tabs" aria-label="Demo perspectives"><button class="view-tab ${!recruiter ? 'active' : ''}" data-action="applicant" aria-pressed="${!recruiter}">Applicant view</button><button class="view-tab ${recruiter ? 'active' : ''}" data-action="recruiter" aria-pressed="${recruiter}" ${!state.approved || state.busy ? 'disabled' : ''} title="${state.approved ? 'Open shared evidence' : 'Available after the applicant shares their evidence'}">Recruiter view</button></nav></header>
  <main id="main" class="main-shell"><div class="hero"><div><div class="eyebrow">${recruiter ? 'Evidence beyond the CV' : 'Your application. Your potential.'}</div><h1 class="screen-title" tabindex="-1">${recruiter ? 'See the thinking<br><em>behind the answer.</em>' : state.evidence ? 'Your work.<br><em>In your own words.</em>' : 'Let your work<br><em>do the talking.</em>'}</h1><p>${recruiter ? 'A short work sample. The original response. A chance to see how someone adapts.' : state.evidence ? 'Preview exactly what a recruiter will see. You decide whether to share it.' : 'You are more than a job title. Show how you would handle a real moment at work.'}</p></div><div class="hero-note"><strong>${recruiter ? 'Human judgment comes first' : 'A little time. A clearer picture.'}</strong>${recruiter ? 'Evidence to start a conversation.' : 'Optional · 5–7 minutes<br>One scenario. One follow-up.'}</div></div>
  ${recruiter ? '' : `<nav class="steps" aria-label="Your progress">${['Your response', 'A fresh perspective', 'Your evidence'].map((label, i) => `<div class="step ${i === stage ? 'current' : i < stage ? 'complete' : ''}" ${i === stage ? 'aria-current="step"' : ''}><span class="step-num">${i < stage ? icon('check') : `0${i + 1}`}</span>${label}</div>`).join('')}</nav>`}
  ${!recruiter ? scenarioPickerHtml() : ''}${content}<footer class="footer"><span>ZEIL Show Your Skills · Integration prototype<br>Fictional scenario and company. This does not submit a real job application.</span><span>Evidence, not a hiring verdict.</span></footer></main></div>`;
}

function policyHtml() {
  return `<section class="policy-section"><h3>${icon('book')} ${e(state.scenario.referenceTitle)}</h3><div class="policy-list">${state.scenario.policies.map(policy => `<div class="policy-item" id="policy-${e(policy.id)}"><span class="policy-id">${e(policy.id)}</span><div><strong>${e(policy.title)}</strong><p>${e(policy.text)}</p></div></div>`).join('')}</div></section>`;
}

function scenarioPickerHtml() {
  return `<section class="scenario-picker" aria-labelledby="scenario-choice"><h2 id="scenario-choice">Choose your work scenario</h2><p>Choose either example, then write your own response or load a fictional sample to explore the demo.</p><div class="scenario-options">${state.scenarios.map(item => `<button class="scenario-option ${item.id === state.scenario.id ? 'active' : ''}" data-action="scenario" data-scenario="${e(item.id)}" aria-pressed="${item.id === state.scenario.id}" ${state.busy ? 'disabled' : ''}><strong>${e(item.role)}</strong><span>${e(item.title)}</span><small>${e(item.description)}</small>${item.id === state.scenario.id ? '<span class="scenario-selected">Selected</span>' : ''}</button>`).join('')}</div><p class="fine-print">Changing scenarios starts a new attempt and clears the current answers, evidence and sharing approval.</p></section>`;
}

function scenarioHtml() {
  const s = state.scenario;
  return `<aside class="card"><div class="card-pad"><div class="job-heading"><div class="company-icon" aria-hidden="true">h</div><div><strong>${e(s.company)}</strong><small>${e(s.role)} · ${e(s.location)}</small></div></div><div class="scenario-head"><p class="section-label">The work scenario</p><span class="pill">${e(s.duration)}</span></div><h2 class="scenario-title">${e(s.title)}</h2><p class="body-copy">${e(s.description)}</p><div class="customer-message"><div class="message-top"><span class="avatar">${e(s.customer.split(' ').map(part => part[0]).join(''))}</span>${e(s.customer)}<span class="pill">${e(s.speakerRole)}</span></div><blockquote>${e(s.message)}</blockquote></div><p class="body-copy">${e(s.task)}</p></div>${policyHtml()}</aside>`;
}

function responseHtml() {
  const refining = Boolean(state.followup);
  const value = refining ? state.revision : state.initial;
  const followup = state.followup;
  return shell(`<div class="workspace">${scenarioHtml()}<section class="card"><div class="card-pad"><div class="panel-header"><h2>${refining ? 'A fresh perspective' : 'How would you respond?'}</h2><span class="pill purple">${refining ? '02 / 03' : '01 / 03'}</span></div><p class="response-intro">${refining ? 'Good work evolves. Consider the follow-up, then revise or clarify your response below.' : e(state.scenario.responseIntro)}</p>
  ${refining ? `<div class="followup-box"><span class="section-label">One follow-up, based on your response</span><h3>${e(followup.question)}</h3><blockquote>“${e(followup.anchorQuote)}”</blockquote><a class="small-link" href="#policy-${e(followup.policyId)}">Reference: ${e(followup.policyId)} · ${e(state.scenario.policies.find(p => p.id === followup.policyId).title)}</a></div>` : ''}
  ${errorHtml()}${loadingHtml(refining ? 'Preparing your evidence card.' : 'Reading your response and choosing one follow-up.')}
  <form id="response-form"><label class="textarea-label" for="answer">${refining ? 'Your revised response and reasoning' : 'Your response and next action'}</label><textarea id="answer" name="answer" minlength="40" maxlength="5000" required ${state.busy ? 'disabled' : ''} placeholder="${e(state.scenario.placeholder)}">${e(value)}</textarea><div class="input-meta"><span>${refining ? 'Your original answer is kept alongside this revision.' : '40 characters minimum. Use fictional information only.'}</span><span id="char-count">${value.length.toLocaleString()} / 5,000</span></div>
  ${!refining ? `<div class="section-label">What the scenario explores</div><div class="criteria">${state.scenario.criteria.slice(0, 3).map(c => `<span>${e(c.label)}</span>`).join('')}</div>` : ''}
  <button class="button wide" type="submit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Preparing…' : refining ? 'Preview my evidence card' : 'Continue to my follow-up'}${icon('arrow')}</button></form>
  <p class="fine-print">${icon('lock')}<span>${refining ? 'Nothing is shared until you approve the evidence card.' : 'Your application is not blocked by this optional exercise. Responses are sent to Gemini to prepare your follow-up and evidence.'}</span></p>
  ${refining ? `<details class="details"><summary>Read my original response</summary><div class="transcript">${e(state.initial)}</div></details><div class="action-row"><button class="text-button" data-action="reset" ${state.busy ? 'disabled' : ''}>Start a new attempt</button></div>` : `<div class="action-row"><button class="text-button" data-action="own" ${state.busy ? 'disabled' : ''}>Write my own response</button><button class="text-button" data-action="sample" ${state.busy ? 'disabled' : ''}>Use a fictional sample response</button>${state.sampleUsed ? '<span class="pill">Sample loaded · includes a policy conflict</span>' : ''}</div>`}
  </div><div class="panel-footer">One focused scenario. No overall score. Your words stay visible.</div></section></div>`, refining ? 1 : 0);
}

function evidenceHtml() {
  const recruiter = state.view === 'recruiter';
  const evidence = state.evidence;
  return shell(`${errorHtml()}${state.approved ? '<div class="share-note" role="status">This evidence card is available in the recruiter preview for this demo session. No employer has been contacted.</div>' : ''}<section class="evidence-top"><div><p class="section-label">${e(state.scenario.role)} · ${e(state.scenario.company)}</p><h2>${recruiter ? 'A work sample you can inspect.' : 'A clearer picture of your approach.'}</h2><p>${recruiter ? 'Read the observations alongside the original work. Excerpts are checked against the applicant’s text; interpretations still need your judgment.' : 'These observations link back to your actual words. Review them alongside your answers before choosing whether to share.'}</p></div><span class="pill green">${state.approved ? 'Shared in demo' : 'Private preview'}</span></section>
  <div class="review-layout"><div><div class="evidence-grid">${state.scenario.criteria.map((criterion, i) => {
    const item = evidence.observations.find(x => x.criterion === criterion.id);
    return `<article class="evidence-card"><div class="evidence-source"><span>0${i + 1} / WORK SAMPLE</span><span class="pill ${item.status === 'observed' ? 'purple' : ''}">${item.status === 'observed' ? 'Evidence found' : 'Not shown'}</span></div><h3>${e(criterion.label)}</h3>${item.quote ? `<blockquote>“${e(item.quote)}”</blockquote><div class="evidence-source"><span>Exact excerpt · ${item.source === 'initial' ? 'original response' : 'revised response'}</span><a class="small-link" href="#source-${e(item.source)}" data-source="${e(item.source)}">View source</a></div>` : '<p class="empty-evidence">No supporting excerpt was identified.</p>'}<p>${e(item.observation)}</p>${item.policyIds.length ? `<div class="policy-refs">${item.policyIds.map(id => `<a href="#policy-${e(id)}">Policy ${e(id)}</a>`).join('')}</div>` : ''}</article>`;
  }).join('')}</div><p class="review-note">AI-generated observations describe this response only. They do not establish overall competence, independent authorship or suitability for a role. “Evidence found” does not mean the answer is correct.</p>
  <section class="card card-pad source-card"><h2 class="panel-header">The work behind the card</h2><div class="transcript-grid"><div id="source-initial"><h3>01 · Original response</h3><div class="transcript">${e(state.initial)}</div></div><div id="source-revision"><h3>02 · Revised response</h3><div class="transcript">${e(state.revision)}</div></div></div><div class="followup-box"><span class="section-label">The follow-up asked</span><h3>${e(state.followup.question)}</h3></div></section><div class="card">${policyHtml()}</div></div>
  <aside class="card review-sidebar"><p class="section-label">Keep the conversation going</p><h3>Worth exploring in an interview</h3><ol>${evidence.interviewQuestions.map(q => `<li>${e(q)}</li>`).join('')}</ol><hr>
  ${recruiter ? '<h3>Context for the reviewer</h3><p>This is an optional work sample from one fictional scenario. Consider it with other relevant evidence and discuss uncertainties with the applicant.</p><button class="button secondary wide" data-action="applicant">Back to applicant view</button>' : `<h3>${state.approved ? 'You control your evidence' : 'Ready to share your work?'}</h3><p>${state.approved ? 'You can withdraw the card from the recruiter preview or revise your answer.' : 'Share this card and both responses with the recruiter preview. This prototype does not send data to a real employer.'}</p><button class="button lime wide" data-action="${state.approved ? 'recruiter' : 'share'}" ${state.busy ? 'disabled' : ''}>${state.approved ? 'Open recruiter view' : 'Share with recruiter preview'}${icon('arrow')}</button><div class="action-row"><button class="text-button" data-action="revise" ${state.busy ? 'disabled' : ''}>Revise my response</button>${state.approved ? '<button class="text-button" data-action="unshare">Withdraw from preview</button>' : ''}</div>`}
  <hr><p class="section-label">Evidence provenance</p><p>Generated with Gemini.<br>Exact quotations checked by the application.<br>Scenario: ${e(state.scenario.id)}.</p><p>Use fictional responses only. Session access expires after two hours. Hosted responses are stored privately for this demo; local sessions disappear when the server restarts.</p></aside></div>`, 2);
}

let renderedScreen = '';

function render(focus = false) {
  const screen = `${state.scenario?.id}:${state.view}:${state.evidence ? 'evidence' : state.followup ? 'followup' : 'response'}`;
  app.innerHTML = state.evidence ? evidenceHtml() : responseHtml();
  // Animate navigation, without replaying motion for loading states or draft actions.
  if (screen !== renderedScreen) {
    app.querySelector('.screen-title')?.classList.add('heading-enter');
    app.querySelectorAll('.workspace, .evidence-top, .review-layout').forEach(panel => panel.classList.add('panel-enter'));
  }
  renderedScreen = screen;
  if (focus) document.querySelector('.screen-title')?.focus({ preventScroll: true });
}

async function submit() {
  const refining = Boolean(state.followup);
  const text = (refining ? state.revision : state.initial).trim();
  if (text.length < 40 || text.length > 5000) { state.error = 'Please write between 40 and 5,000 characters.'; return render(); }
  state.busy = true; state.error = ''; render();
  try {
    if (refining) {
      const result = await request('/api/evidence', { revision: text, scenarioId: state.scenario.id });
      Object.assign(state, { revision: text, evidence: result.evidence, model: result.model, approved: false });
    } else {
      const result = await request('/api/followup', { answer: text, scenarioId: state.scenario.id });
      Object.assign(state, { initial: text, revision: text, followup: result.followup });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (error) { state.error = error.message || 'Connection lost. Your text is preserved; please try again.'; }
  finally { state.busy = false; render(true); }
}

app.addEventListener('input', event => {
  if (event.target.id !== 'answer') return;
  state[state.followup ? 'revision' : 'initial'] = event.target.value;
  document.querySelector('#char-count').textContent = `${event.target.value.length.toLocaleString()} / 5,000`;
});
app.addEventListener('submit', event => { if (event.target.id === 'response-form') { event.preventDefault(); submit(); } });
app.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || state.busy) return;
  const action = button.dataset.action;
  state.error = '';
  try {
    if (action === 'scenario') {
      if (button.dataset.scenario === state.scenario.id) return;
      if ((state.initial || state.revision || state.evidence) && !window.confirm('Change scenario? This will discard the current answers and evidence card and withdraw sharing.')) return;
      state.busy = true; render();
      const result = await request('/api/scenario', { scenarioId: button.dataset.scenario });
      Object.assign(state, { scenario: result.scenario, initial: '', revision: '', followup: null, evidence: null, approved: false, model: '', sampleUsed: false, view: 'applicant' });
    }
    if (action === 'own') {
      if (state.initial && !window.confirm('Clear this draft and write your own response?')) return;
      state.initial = ''; state.sampleUsed = false;
    }
    if (action === 'sample') { state.initial = state.scenario.sampleAnswer; state.sampleUsed = true; }
    if (action === 'applicant') state.view = 'applicant';
    if (action === 'recruiter') { const result = await request('/api/recruiter'); Object.assign(state, result); state.view = 'recruiter'; }
    if (action === 'share') { state.busy = true; render(); await request('/api/share', {}); state.approved = true; state.view = 'recruiter'; }
    if (action === 'unshare') { await request('/api/unshare', {}); state.approved = false; }
    if (action === 'revise') { await request('/api/revise', {}); state.approved = false; state.evidence = null; state.view = 'applicant'; }
    if (action === 'reset') {
      if (!window.confirm('Start a new attempt? This will discard the current answers and evidence card.')) return;
      await request('/api/reset', {});
      Object.assign(state, { initial: '', revision: '', followup: null, evidence: null, approved: false, sampleUsed: false });
    }
  } catch (error) { state.error = error.message || 'Connection lost. Please try again.'; }
  finally {
    state.busy = false;
    render(true);
    if (['applicant', 'recruiter', 'share', 'revise', 'reset', 'scenario'].includes(action)) window.scrollTo({ top: 0, behavior: 'instant' });
    if (action === 'own') document.querySelector('#answer')?.focus();
  }
});

async function initialise() {
  try {
    const data = await request('/api/session');
    state.scenario = data.scenario;
    state.scenarios = data.scenarios;
    Object.assign(state, data.state);
    render();
  } catch {
    app.innerHTML = '<main class="boot"><h1>Let’s reconnect.</h1><p>The application could not restore your session. Please try again.</p><button class="button" id="reload">Try again</button></main>';
    document.querySelector('#reload').addEventListener('click', initialise);
  }
}
initialise();
