import test from 'node:test';
import assert from 'node:assert/strict';
import { createBubbleFrames, TAILWIND_PURPLES } from '../assets/animator.js';

test('uses only tailwind purple shades', () => {
  assert.equal(TAILWIND_PURPLES.length, 10);
  for (const hex of TAILWIND_PURPLES) {
    assert.match(hex, /^#[0-9a-f]{6}$/i);
  }
});

test('generates deterministic animation frames', () => {
  const frames = createBubbleFrames(8);
  assert.equal(frames.length, 8);
  assert.deepEqual(frames[0], { leftY: 70, rightY: 65, glowIndex: 4, ringRotate: 0 });
  assert.equal(frames[7].ringRotate, 315);
});
