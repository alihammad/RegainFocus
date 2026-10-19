import type { RegainDb, SyncEngine } from '@regain/core';

/**
 * Decides when to sync: on start, after every local write, when the network returns, when the
 * tab becomes visible, and on a timer as a fallback to realtime. Only one sync runs at a time.
 */
export class SyncRunner {
  private running = false;
  private again = false;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly engine: SyncEngine,
    private readonly db: RegainDb,
    private readonly intervalMs = 8000,
  ) {}

  readonly kick = (): void => {
    void this.run();
  };

  // Dexie runs hooks inside the write's transaction, so sync only after it has committed.
  private readonly onWrite = (): void => {
    setTimeout(this.kick, 0);
  };

  private readonly onVisible = (): void => {
    if (document.visibilityState === 'visible') this.kick();
  };

  start(): void {
    this.db.outbox.hook('creating').subscribe(this.onWrite);
    this.db.outbox.hook('updating').subscribe(this.onWrite);
    window.addEventListener('online', this.kick);
    document.addEventListener('visibilitychange', this.onVisible);
    this.timer = setInterval(this.kick, this.intervalMs);
    this.kick();
  }

  stop(): void {
    this.db.outbox.hook('creating').unsubscribe(this.onWrite);
    this.db.outbox.hook('updating').unsubscribe(this.onWrite);
    window.removeEventListener('online', this.kick);
    document.removeEventListener('visibilitychange', this.onVisible);
    clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = true;
    try {
      do {
        this.again = false;
        await this.engine.sync();
      } while (this.again);
    } catch (error) {
      // Offline or the server is down. The queue keeps everything and the timer retries.
      console.warn('Sync failed, will retry', error);
    } finally {
      this.running = false;
    }
  }
}
