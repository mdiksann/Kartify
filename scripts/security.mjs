import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n');
const findings = [];
for (const file of files) {
  if (/^\.env(?:\.|$)/.test(file) && file !== '.env.example')
    findings.push(`${file}: environment file tracked`);
  if (
    !/\.(?:ts|tsx|js|mjs|json|ya?ml)$/.test(file) ||
    file === 'scripts/security.mjs' ||
    file === 'pnpm-lock.yaml'
  )
    continue;
  const source = readFileSync(file, 'utf8');
  if (file.startsWith('src/')) {
    if (/dangerouslySetInnerHTML/.test(source))
      findings.push(`${file}: unsafe HTML rendering`);
    if (
      /\bany\b/.test(
        source
          .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')
          .replace(/(['"`])(?:\\.|(?!\1)[\s\S])*?\1/g, ''),
      )
    )
      findings.push(`${file}: explicit any`);
    if (/@ts-ignore/.test(source))
      findings.push(`${file}: unchecked TypeScript suppression`);
  }
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\bghp_[a-zA-Z0-9]{36}\b|\bsk-proj-[a-zA-Z0-9_-]{30,}\b/.test(
      source,
    )
  )
    findings.push(`${file}: possible secret`);
}
assert.deepEqual(findings, [], 'Security source sweep failed');
console.log('PASS: source HTML/types/secrets and tracked environment files');
