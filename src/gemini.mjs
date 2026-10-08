// Server-side only. Never import this module into browser code.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);

export async function generateText(prompt, { schema, system } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'replace_with_your_private_key') {
    throw new Error('Set GEMINI_API_KEY in the project .env file before running this check.');
  }
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('Invalid GEMINI_MODEL name.');

  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          generationConfig: {
            maxOutputTokens: 6000,
            ...(schema ? { responseMimeType: 'application/json', responseJsonSchema: schema } : {}),
          },
        }),
        signal: AbortSignal.timeout(45_000),
      });
    } catch {
      throw new Error('Gemini connection failed or timed out. Check network access and try again.');
    }
    if ([429, 500, 503].includes(response.status) && attempt < 2) {
      await response.body?.cancel();
      await delay(2000 * (2 ** attempt));
      continue;
    }
    if (!response.ok) {
      // Do not echo upstream error bodies: they may contain credential details.
      const hint = response.status === 429 ? 'Shared quota is busy; wait before retrying.'
        : [400, 403].includes(response.status) ? 'Check the private key and ask an organiser if needed.'
        : 'Check the model name and provider status.';
      throw new Error(`Gemini HTTP ${response.status}. ${hint}`);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts
      ?.filter(part => !part.thought && typeof part.text === 'string')
      .map(part => part.text).join('').trim();
    if (!text) throw new Error('Gemini returned no text. The check has not passed.');
    return { text, model: data.modelVersion || model };
  }
}

export async function generateStructured(prompt, schema, system) {
  const result = await generateText(prompt, { schema, system });
  try {
    return { data: JSON.parse(result.text), model: result.model };
  } catch {
    throw new Error('The AI returned an unreadable response. Your answer is preserved; please try again.');
  }
}
