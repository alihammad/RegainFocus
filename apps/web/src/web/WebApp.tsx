import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { APP_NAME, EmptyTitleError, type Quadrant } from '@regain/core';
import { Logo } from '../components/icons';
import { QUADRANT_LABEL } from '../components/QuadrantGlyph';
import { Toast } from '../components/Toast';
import { useData, useInbox } from '../data/DataProvider';
import { Quadrants } from './Quadrants';
import { ToSort } from './ToSort';

const TOAST_MS = 5000;

interface ToastState {
  message: string;
  undo: () => Promise<unknown>;
}

export function WebApp() {
  const { repo } = useData();
  const inbox = useInbox();
  const [text, setText] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const capture = async (e: FormEvent) => {
    e.preventDefault();
    if (saving.current || !text.trim()) return;
    saving.current = true;
    try {
      const task = await repo.createCapture({ title: text, source: 'web' });
      setText('');
      setError(null);
      setToast({ message: 'Saved to To sort', undo: () => repo.undoCapture(task.id) });
    } catch (err) {
      if (!(err instanceof EmptyTitleError)) {
        setError("Couldn't save. Your text is still here. Try again.");
      }
    } finally {
      saving.current = false;
    }
  };

  const triage = useCallback(
    async (id: string, quadrant: Exclude<Quadrant, 'inbox'>) => {
      const change = await repo.triage(id, quadrant);
      if (change) setToast({ message: `Moved to ${QUADRANT_LABEL[quadrant]}`, undo: change.undo });
    },
    [repo],
  );

  const undo = async () => {
    if (!toast) return;
    const { undo: run } = toast;
    setToast(null);
    await run();
  };

  const oldest = inbox && inbox.length > 0 ? inbox[inbox.length - 1] : undefined;

  return (
    <div className="w-app">
      <header className="w-header">
        <div className="w-header-inner">
          <p className="w-brand">
            <Logo />
            <span>{APP_NAME}</span>
          </p>
          <form className="w-capture" onSubmit={(e) => void capture(e)}>
            <label htmlFor="web-capture" className="visually-hidden">
              Capture a thought
            </label>
            <input
              id="web-capture"
              className="w-capture-input"
              type="text"
              autoComplete="off"
              placeholder="Capture a thought and get back to it"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </form>
        </div>
        {error && (
          <p className="m-notice w-notice" role="alert">
            {error}
          </p>
        )}
      </header>

      <main className="w-main">
        <ToSort
          task={oldest}
          count={inbox?.length ?? 0}
          onTriage={(q) => oldest && void triage(oldest.id, q)}
        />
        <Quadrants />
      </main>

      {toast && <Toast message={toast.message} onUndo={() => void undo()} />}
    </div>
  );
}
