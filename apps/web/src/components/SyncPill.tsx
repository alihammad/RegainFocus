import type { SyncState } from '@regain/core';
import { useSyncState } from '../data/DataProvider';

export const SYNC_LABEL: Record<SyncState, string> = {
  synced: 'Synced to web',
  pending: 'Saving… will sync',
  offline: 'Offline. Saved on this phone',
};

export function SyncPill() {
  const state = useSyncState();
  return (
    <span className="sync-pill" role="status" data-state={state}>
      <span className="sync-dot" aria-hidden="true" />
      <span>{SYNC_LABEL[state]}</span>
    </span>
  );
}
