import { execFileSync } from 'node:child_process';

// Scan exactly the staged/tracked content, including files deleted from disk.
// Never print matched lines or credential values.
const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const googleKey = new RegExp('AI' + 'za' + '[0-9A-Za-z_-]{35}');
const forbidden = paths.filter(path => /(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith('.env.example'));
for (const path of paths) {
  const content = execFileSync('git', ['show', `:${path}`], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (googleKey.test(content)) forbidden.push(path);
}
if (forbidden.length) {
  console.error(`Secret check: FAIL (${new Set(forbidden).size} file(s)). Do not push.`);
  process.exitCode = 1;
} else {
  console.log(`Secret check: PASS (${paths.length} staged/tracked files checked).`);
}
