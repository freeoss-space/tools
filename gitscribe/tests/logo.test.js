import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('GitScribe animated logo uses purple Tailwind palette and has eyes', () => {
  const svg = readFileSync(new URL('../assets/mascot.svg', import.meta.url), 'utf8');
  assert.match(svg, /#8b5cf6|#7c3aed|#a78bfa/i, 'uses Tailwind purple hues');
  assert.match(svg, /radialGradient|linearGradient/, 'includes gradient animation base');
  assert.match(svg, /<circle[^>]*id="eye-left"|class="eye"/, 'has left eye');
  assert.match(svg, /<circle[^>]*id="eye-right"|class="eye"/, 'has right eye');
  assert.match(svg, /git branch/i, 'references git motif');
});
