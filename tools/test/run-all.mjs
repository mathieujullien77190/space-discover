// Lance tous les tests du moteur (tools/test/*.test.mjs) un par un ; échoue si l'un d'eux échoue ou affiche « ÉCHEC ».
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;
for (const f of readdirSync(dir).filter(n => n.endsWith('.test.mjs')).sort()) {
  let out;
  try { out = execFileSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { out = (e.stdout || '') + (e.stderr || ''); failed++; console.log('✗ ' + f + '\n' + out); continue; }
  const bad = out.split('\n').filter(l => l.startsWith('ÉCHEC'));
  if (bad.length) { failed++; console.log('✗ ' + f + '\n' + bad.join('\n')); } else console.log('✓ ' + f);
}
process.exit(failed ? 1 : 0);
