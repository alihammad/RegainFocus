import { useState } from 'react';
import type { Task } from '@regain/core';
import { DesktopIcon } from '../components/icons';
import { SyncPill } from '../components/SyncPill';
import { formatCaptureTime, isToday, tagsFor } from '../lib/time';

const VISIBLE = 5; // long lists collapse after a few items

function Group({
  id,
  title,
  tasks,
  freshId,
  now,
}: {
  id: string;
  title: string;
  tasks: Task[];
  freshId: string | null;
  now: Date;
}) {
  const [expanded, setExpanded] = useState(false);
  if (tasks.length === 0) return null;
  const shown = expanded ? tasks : tasks.slice(0, VISIBLE);
  const hidden = tasks.length - shown.length;
  return (
    <section aria-labelledby={id} className="m-stack-sm">
      <h2 id={id} className="m-h2 m-h2-muted">
        {title}
      </h2>
      <ul className="item-list">
        {shown.map((task) => (
          <li key={task.id} className="item" data-fresh={task.id === freshId}>
            <span className="item-text item-text-large">{task.title}</span>
            <span className="item-meta">
              <span>{formatCaptureTime(task.createdAt, now)}</span>
              {tagsFor(task).map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button type="button" className="btn-link btn-link-start" onClick={() => setExpanded(true)}>
          Show {hidden} more
        </button>
      )}
    </section>
  );
}

export function InboxScreen({ tasks, freshId }: { tasks: Task[]; freshId: string | null }) {
  const now = new Date();
  const today = tasks.filter((t) => isToday(t.createdAt, now));
  const earlier = tasks.filter((t) => !isToday(t.createdAt, now));

  return (
    <div className="m-screen">
      <div className="m-header">
        <h1 className="m-title">
          <span>Inbox</span>
          <span className="count-badge" aria-label={`${tasks.length} waiting`}>
            {tasks.length}
          </span>
        </h1>
        <SyncPill />
      </div>

      <div className="info-banner">
        <DesktopIcon />
        <span>
          These wait in To sort on your web matrix. Sort them there when you're at your desk.
        </span>
      </div>

      {tasks.length === 0 && (
        <p className="m-empty">Inbox is clear. Nothing waiting to be sorted.</p>
      )}
      <Group id="today-heading" title="Today" tasks={today} freshId={freshId} now={now} />
      <Group id="earlier-heading" title="Earlier" tasks={earlier} freshId={freshId} now={now} />
    </div>
  );
}
