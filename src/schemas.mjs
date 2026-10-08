const string = (minLength = 1, maxLength = 800) => ({ type: 'string', minLength, maxLength });
const enumeration = values => ({ type: 'string', enum: values });
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const policy = enumeration(['P1', 'P2', 'P3', 'P4']);

export const followupSchema = object({
  question: string(20, 700),
  anchorQuote: string(6, 700),
  policyId: policy,
});

export const evidenceSchema = object({
  observations: { type: 'array', minItems: 4, maxItems: 4, items: object({
    criterion: enumeration(['communication', 'policy', 'ownership', 'adaptation']),
    status: enumeration(['observed', 'not_shown']),
    source: enumeration(['initial', 'revision']),
    quote: string(0, 900),
    observation: string(15, 600),
    policyIds: { type: 'array', items: policy, minItems: 0, maxItems: 4 },
  }) },
  interviewQuestions: { type: 'array', minItems: 1, maxItems: 3, items: string(15, 400) },
});

// Validates every JSON Schema keyword used above. No coercion or silent repairs.
export function validateSchema(value, schema) {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if (schema.required.some(key => !Object.hasOwn(value, key))) return false;
    if (schema.additionalProperties === false && Object.keys(value).some(key => !Object.hasOwn(schema.properties, key))) return false;
    return Object.entries(schema.properties).every(([key, child]) => validateSchema(value[key], child));
  }
  if (schema.type === 'array') return Array.isArray(value)
    && value.length >= schema.minItems && value.length <= schema.maxItems
    && value.every(item => validateSchema(item, schema.items));
  if (schema.type === 'string') return typeof value === 'string'
    && (schema.minLength === undefined || value.length >= schema.minLength)
    && (schema.maxLength === undefined || value.length <= schema.maxLength)
    && (!schema.enum || schema.enum.includes(value));
  return false;
}

export function validateFollowup(data, answer) {
  return validateSchema(data, followupSchema) && answer.includes(data.anchorQuote);
}

export function validateEvidence(data, initial, revision) {
  if (!validateSchema(data, evidenceSchema)) return false;
  if (new Set(data.observations.map(item => item.criterion)).size !== 4) return false;
  return data.observations.every(item => {
    if (item.status === 'not_shown') return item.quote === '';
    const source = item.source === 'initial' ? initial : revision;
    return item.quote.trim().length >= 6 && source.includes(item.quote);
  });
}
