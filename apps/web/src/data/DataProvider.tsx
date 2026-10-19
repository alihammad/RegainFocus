import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  RegainDb,
  SupabaseRemote,
  SyncEngine,
  TaskRepository,
  syncState,
  type SyncState,
  type Task,
} from '@regain/core';
import { supabase } from '../lib/supabase';
import { SyncRunner } from './syncRunner';

interface DataApi {
  db: RegainDb;
  repo: TaskRepository;
}

const DataContext = createContext<DataApi | null>(null);

export function DataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const api = useMemo(() => {
    // One local database per user, so two people on one device never see each other's tasks.
    const db = new RegainDb(`regain-focus-${userId}`);
    const repo = new TaskRepository(db, { userId });
    const runner = supabase
      ? new SyncRunner(new SyncEngine(db, new SupabaseRemote(supabase)), db)
      : null;
    return { db, repo, runner };
  }, [userId]);

  useEffect(() => {
    api.runner?.start();
    // Realtime: another device's change triggers a pull straight away. The runner's timer
    // covers the case where the realtime connection is down.
    const channel = supabase
      ?.channel(`tasks-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        api.runner?.kick ?? (() => {}),
      )
      .subscribe();
    return () => {
      api.runner?.stop();
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [api, userId]);

  const value = useMemo(() => ({ db: api.db, repo: api.repo }), [api]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataApi {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

const subscribeOnline = (notify: () => void) => {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
};

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export function useSyncState(): SyncState {
  const { db } = useData();
  const pending = useLiveQuery(() => db.outbox.count(), [db], 0);
  return syncState(useOnline(), pending);
}

/** Inbox (newest first). Re-renders whenever the local store changes, including after a pull. */
export function useInbox(): Task[] | undefined {
  const { repo } = useData();
  return useLiveQuery(() => repo.listInbox(), [repo]);
}

export function useQuadrant(quadrant: 'do' | 'plan' | 'delegate' | 'drop'): Task[] | undefined {
  const { repo } = useData();
  return useLiveQuery(() => repo.listByQuadrant(quadrant), [repo, quadrant]);
}
