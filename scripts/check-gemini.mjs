import { generateText } from '../src/gemini.mjs';

try {
  const result = await generateText('Reply with exactly this sentence and nothing else: Hello ZEIL Hackathon! Show Your Skills is connected.');
  console.log('Gemini connection: PASS');
  console.log(`Model: ${result.model}`);
  console.log(`Reply: ${result.text}`);
} catch (error) {
  console.error(`Gemini connection: FAIL. ${error.message}`);
  process.exitCode = 1;
}
