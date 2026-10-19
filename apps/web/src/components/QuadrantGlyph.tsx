import type { Quadrant } from '@regain/core';

type Sorted = Exclude<Quadrant, 'inbox'>;

// The filled cell names the quadrant: top-left Do now, top-right Plan,
// bottom-left Delegate, bottom-right Drop. Always shown next to a text label.
const FILLED: Record<Sorted, number> = { do: 0, plan: 1, delegate: 2, drop: 3 };

export const QUADRANT_LABEL: Record<Sorted, string> = {
  do: 'Do now',
  plan: 'Plan',
  delegate: 'Delegate',
  drop: 'Drop',
};

export function QuadrantGlyph({ quadrant }: { quadrant: Sorted }) {
  const filled = FILLED[quadrant];
  const cell = (i: number) => {
    const x = (i % 2) * 9 + 0.5;
    const y = Math.floor(i / 2) * 9 + 0.5;
    return (
      <rect
        key={i}
        x={x}
        y={y}
        width="6"
        height="6"
        rx="1.5"
        className={i === filled ? 'glyph-filled' : 'glyph-empty'}
      />
    );
  };
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {[0, 1, 2, 3].map(cell)}
    </svg>
  );
}
