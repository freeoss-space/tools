import { createBubbleFrames, TAILWIND_PURPLES } from './animator.js';

const left = document.querySelector('.bubble-left');
const right = document.querySelector('.bubble-right');
const face = document.querySelector('.face');
const ring = document.querySelector('.git-ring');
const frames = createBubbleFrames(16);

let i = 0;
setInterval(() => {
  const frame = frames[i % frames.length];
  left.style.bottom = `${frame.leftY}px`;
  right.style.bottom = `${frame.rightY}px`;
  face.style.background = `linear-gradient(135deg, ${TAILWIND_PURPLES[frame.glowIndex]}, ${TAILWIND_PURPLES[frame.glowIndex + 3]})`;
  ring.style.transform = `rotate(${frame.ringRotate}deg)`;
  i += 1;
}, 400);
