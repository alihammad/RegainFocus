import { useState } from 'react';
import type { Quadrant, Task } from '@regain/core';
import { QUADRANT_LABEL, QuadrantGlyph } from '../components/QuadrantGlyph';
import { useQuadrant } from '../data/DataProvider';

type Sorted = Exclude<Quadrant, 'inbox'>;

const VISIBLE = 3; // long lists collapse after a few rows

const EMPTY_LINE: Record<Sorted, string> = {
  do: 'Nothing on fire.',
  plan: 'Nothing planned yet.',
  delegate: 'Nothing to hand off.',
  drop: 'Nothing to drop.',
};

function QuadrantList({ quadrant }: { quadrant: Sorted }) {
  const tasks: Task[] = useQuadrant(quadrant) ?? [];
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? tasks : tasks.slice(0, VISIBLE);
  const hidden = tasks.length - shown.length;
  const id = `quadrant-${quadrant}`;

  return (
    <section
      aria-labelledby={id}
      className="w-quadrant"
      data-empty={tasks.length === 0}
      data-quadrant={quadrant}
    >
      <h2 id={id} className="w-h2">
        <QuadrantGlyph quadrant={quadrant} />
        <span>{QUADRANT_LABEL[quadrant]}</span>
        <span className="w-count">{tasks.length}</span>
      </h2>
      {tasks.length === 0 ? (
        <p className="m-empty">{EMPTY_LINE[quadrant]}</p>
      ) : (
        <ul className="w-rows">
          {shown.map((task) => (
            <li key={task.id} className="w-row">
              {task.title}
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <button type="button" className="btn-link btn-link-start" onClick={() => setExpanded(true)}>
          Show {hidden} more
        </button>
      )}
    </section>
  );
}

// The matrix layout is fixed: urgent on the left, not urgent on the right,
// important on top, not important below.
export function Quadrants() {
  return (
    <div className="w-matrix">
      <div className="w-column w-column-urgent">
        <QuadrantList quadrant="do" />
        <QuadrantList quadrant="delegate" />
      </div>
      <div className="w-column w-column-not-urgent">
        <QuadrantList quadrant="plan" />
        <QuadrantList quadrant="drop" />
      </div>
    </div>
  );
}
