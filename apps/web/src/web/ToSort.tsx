import type { Quadrant, Task } from '@regain/core';
import { QUADRANT_LABEL, QuadrantGlyph } from '../components/QuadrantGlyph';
import { formatCaptureTime, tagsFor } from '../lib/time';

type Sorted = Exclude<Quadrant, 'inbox'>;

// Laid out as the matrix itself: urgent on the left, important on top.
const BUTTONS: Sorted[] = ['do', 'plan', 'delegate', 'drop'];

interface Props {
  task: Task | undefined;
  count: number;
  onTriage: (quadrant: Sorted) => void;
}

export function ToSort({ task, count, onTriage }: Props) {
  return (
    <section aria-labelledby="to-sort-heading" className="w-section">
      <h1 id="to-sort-heading" className="w-h1">
        <span>To sort</span>
        <span className="count-badge" aria-label={`${count} waiting`}>
          {count}
        </span>
      </h1>
      {task ? (
        <div className="focus-card focus-card-web">
          <p className="w-sort-title">{task.title}</p>
          <p className="item-meta">
            <span>{formatCaptureTime(task.createdAt, new Date())}</span>
            {tagsFor(task).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </p>
          <div role="group" aria-label="Where does this go?" className="w-triage">
            {BUTTONS.map((q) => (
              <button key={q} type="button" className="btn-quiet" onClick={() => onTriage(q)}>
                <QuadrantGlyph quadrant={q} />
                <span>{QUADRANT_LABEL[q]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="m-empty">Nothing to sort right now.</p>
      )}
    </section>
  );
}
