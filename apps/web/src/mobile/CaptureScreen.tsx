import type { KeyboardEvent } from 'react';
import type { Task } from '@regain/core';
import { InboxIcon, Logo, MicIcon } from '../components/icons';
import { SyncPill } from '../components/SyncPill';
import { formatCaptureTime, tagsFor } from '../lib/time';

export interface Draft {
  text: string;
  when?: 'today' | 'this_week';
  energy?: 'quick' | 'deep';
}

// Today / This week are one group, Quick win / Deep focus the other: one per group at a time.
const CHIPS = [
  { label: 'Today', group: 'when', value: 'today' },
  { label: 'This week', group: 'when', value: 'this_week' },
  { label: 'Quick win', group: 'energy', value: 'quick' },
  { label: 'Deep focus', group: 'energy', value: 'deep' },
] as const;

interface Props {
  draft: Draft;
  onDraft: (draft: Draft) => void;
  onSave: () => void;
  onMic: () => void;
  recent: Task[];
  count: number;
  freshId: string | null;
  error: string | null;
  note: string | null;
  onSeeAll: () => void;
}

export function CaptureScreen({
  draft,
  onDraft,
  onSave,
  onMic,
  recent,
  count,
  freshId,
  error,
  note,
  onSeeAll,
}: Props) {
  const canSave = draft.text.trim().length > 0;

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSave();
    }
  };

  const toggle = (group: 'when' | 'energy', value: string) => {
    onDraft({ ...draft, [group]: draft[group] === value ? undefined : value });
  };

  const now = new Date();

  return (
    <div className="m-screen">
      <div className="m-header">
        <h1 className="m-title">
          <Logo />
          <span>Capture</span>
        </h1>
        <SyncPill />
      </div>

      <div className="focus-card focus-card-mobile">
        <label htmlFor="capture-text" className="capture-label">
          What's on your mind?
        </label>
        <textarea
          id="capture-text"
          className="capture-box"
          rows={3}
          placeholder="Type it before it slips away"
          enterKeyHint="send"
          autoFocus
          value={draft.text}
          onChange={(e) => onDraft({ ...draft, text: e.target.value })}
          onKeyDown={onKeyDown}
        />
      </div>

      <div className="m-stack-sm">
        <p className="m-helper">Optional. You can sort it properly on the web.</p>
        <div role="group" aria-label="Optional tags" className="chip-row">
          {CHIPS.map((chip) => {
            const pressed = draft[chip.group] === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                className="chip-toggle"
                aria-pressed={pressed}
                onClick={() => toggle(chip.group, chip.value)}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="m-stack-sm">
        <div className="m-actions">
          <button type="button" className="btn-mic" aria-label="Capture by voice" onClick={onMic}>
            <MicIcon />
          </button>
          <button
            type="button"
            className="btn-primary btn-save"
            disabled={!canSave}
            onClick={onSave}
          >
            <InboxIcon size={18} />
            <span>Save to inbox</span>
          </button>
        </div>
        <p className="m-helper">The Return key saves too.</p>
        {note && (
          <p className="m-helper" role="status">
            {note}
          </p>
        )}
        {error && (
          <p className="m-notice" role="alert">
            {error}
          </p>
        )}
      </div>

      <section aria-labelledby="recent-heading" className="m-stack-md">
        <div className="m-row-between">
          <h2 id="recent-heading" className="m-h2">
            Recently captured
          </h2>
          <button type="button" className="btn-link" onClick={onSeeAll}>
            See all {count}
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="m-empty">Nothing yet. Your first thought will land here.</p>
        ) : (
          <ul className="item-list">
            {recent.map((task) => (
              <li key={task.id} className="item item-compact" data-fresh={task.id === freshId}>
                <span className="item-text">{task.title}</span>
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
        )}
      </section>
    </div>
  );
}
