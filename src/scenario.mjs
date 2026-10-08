export const scenario = {
  id: 'customer-support-double-charge-v1',
  company: 'Harbour Goods',
  role: 'Customer Support Specialist',
  location: 'Auckland, NZ',
  title: 'One customer. Two charges.',
  duration: '5–7 minutes',
  description: 'Help a customer resolve a duplicate payment while setting clear, realistic expectations.',
  customer: 'Alex Morgan',
  speakerRole: 'Customer',
  referenceTitle: 'Your reference: refund policy',
  responseIntro: 'Write a reply to Alex and explain your next action. We are interested in your approach, not perfect wording.',
  placeholder: 'Hi Alex, …',
  message: 'Hi, I was charged twice for my $89 order yesterday. I already emailed and nobody has replied. I need that money for groceries today. Can you please fix this now?',
  task: 'Write the reply you would send Alex, then briefly explain what you would do next. Use the policy below. There is no need to share personal information.',
  policies: [
    { id: 'P1', title: 'Verify first', text: 'Confirm the order number and check the payment record before confirming a duplicate charge. Never request a full card number, password or security code.' },
    { id: 'P2', title: 'Refund timing', text: 'A confirmed duplicate charge can be refunded. Funds normally arrive in 3–5 business days. Same-day arrival cannot be guaranteed.' },
    { id: 'P3', title: 'Urgent situations', text: 'Escalate urgent financial hardship to the support lead. Escalation does not guarantee a faster refund or compensation.' },
    { id: 'P4', title: 'Own the follow-up', text: 'Acknowledge previous contact, explain the next action, and offer an update within one business day.' },
  ],
  criteria: [
    { id: 'communication', label: 'Customer communication', description: 'Acknowledge the concern and explain the next step clearly.' },
    { id: 'policy', label: 'Policy handling', description: 'Work within the supplied refund and verification policy.' },
    { id: 'ownership', label: 'Ownership', description: 'Describe a practical action and a follow-up.' },
    { id: 'adaptation', label: 'Adaptation', description: 'Respond thoughtfully to a relevant follow-up.' },
  ],
  sampleAnswer: 'Hi Alex, I am sorry you have been charged twice and have had to contact us again. I understand you need the money urgently. Please send your order number so I can check the payments. Once I confirm the duplicate charge, I will arrange the refund today and make sure you get your money back today. I will also flag this with our support lead and update you within one business day.\n\nMy next step is to check the order and payment history, then refund any confirmed duplicate charge.',
};

export const engineeringScenario = {
  id: 'software-engineering-payment-incident-v1',
  company: 'Harbour Goods',
  role: 'Software Engineer',
  location: 'Auckland, NZ',
  title: 'One deployment. Duplicate payments.',
  duration: '5–7 minutes',
  description: 'Respond to a payment incident, investigate safely and explain how you would verify recovery.',
  customer: 'Sam Patel',
  speakerRole: 'Engineering lead',
  referenceTitle: 'Your reference: incident runbook',
  responseIntro: 'Write your incident response to Sam and explain your investigation plan. No code or specialist payment-platform knowledge is required; use the runbook.',
  placeholder: 'Hi Sam, my first actions would be …',
  message: 'Since the checkout retry update went live 20 minutes ago, support has reported three possible duplicate charges. Some payment requests timed out, but we do not yet know whether the provider accepted them. The latest release changed retry behaviour. What would you do in the next 15 minutes, and how would you establish that checkout is safe?',
  task: 'Write a short update to Sam and describe your containment, investigation and verification steps. Distinguish confirmed facts from hypotheses. Use the runbook below and fictional information only.',
  policies: [
    { id: 'P1', title: 'Contain before replaying', text: 'Notify the incident lead and coordinate disabling the affected retry path or rolling back the release. A timeout does not prove a payment failed. Do not replay uncertain payments until their provider status has been reconciled; reuse the original idempotency key for any approved retry.' },
    { id: 'P2', title: 'Investigate with evidence', text: 'Compare pre- and post-release behaviour. Correlate order IDs, request IDs, idempotency keys and provider transaction status using redacted logs. Treat the release as a hypothesis, not a confirmed root cause. Never request credentials or full card details.' },
    { id: 'P3', title: 'Verify recovery', text: 'Use sandbox tests for a timeout after successful payment and repeated submissions. Verify at most one charge per order and correct reconciliation. Monitor production after mitigation with the incident lead; a passing health check alone does not establish recovery.' },
    { id: 'P4', title: 'Communicate and reconcile', text: 'Send an update within 15 minutes stating known impact, uncertainties, actions, owner and next update. Coordinate confirmed duplicate-charge reconciliation with support and the incident lead. Do not promise a refund or recovery time before verification.' },
  ],
  criteria: [
    { id: 'communication', label: 'Incident communication', description: 'Explain known impact, uncertainty and the next update clearly.' },
    { id: 'policy', label: 'Technical reasoning and risk', description: 'Use the runbook to contain risk and investigate with evidence.' },
    { id: 'ownership', label: 'Investigation and recovery', description: 'Identify practical investigation, verification and follow-up steps.' },
    { id: 'adaptation', label: 'Adaptation', description: 'Revise the plan thoughtfully after a relevant follow-up.' },
  ],
  sampleAnswer: 'Hi Sam, we have three reports of possible duplicate charges following the retry update. I suspect the new retry logic, but I would compare the logs before confirming the cause. I will notify the incident lead and coordinate disabling the affected retry path. To recover the timed-out payments, I will replay every timed-out request with a new idempotency key. I will correlate order IDs and provider transaction status using redacted logs, then test repeated submissions in the sandbox. I will send an update within 15 minutes with the known impact, remaining uncertainty and next actions.',
};

export const scenarios = [scenario, engineeringScenario];
export const scenarioOptions = scenarios.map(({ id, role, title, description }) => ({ id, role, title, description }));
export const getScenario = id => scenarios.find(item => item.id === id);
