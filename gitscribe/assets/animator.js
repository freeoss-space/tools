export const TAILWIND_PURPLES = [
  '#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc',
  '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'
];

export function createBubbleFrames(count = 8) {
  return Array.from({ length: count }, (_, i) => {
    const offset = (i * 7) % 24;
    return {
      leftY: 70 - (offset % 18),
      rightY: 74 - ((offset + 9) % 18),
      glowIndex: (i % 5) + 4,
      ringRotate: i * 45
    };
  });
}
