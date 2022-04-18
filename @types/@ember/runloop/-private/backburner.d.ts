import type { EmberRunTimer } from '@ember/runloop/types';

export interface QueueItem {
  method: string;
  target: object;
  args: object[];
  stack: string | undefined;
}

export interface DeferredActionQueues {
  [index: string]: unknown;
  queues: object;
  schedule(
    queueName: string,
    target: unknown,
    method: unknown,
    args: unknown,
    onceFlag: boolean,
    stack: unknown
  ): unknown;
  flush(fromAutorun: boolean): unknown;
}

export interface DebugInfo {
  autorun: Error | undefined | null;
  counters: object;
  timers: QueueItem[];
  instanceStack: DeferredActionQueues[];
}

export interface Backburner {
  join<T>(fn: () => T): T;
  on(...args: unknown[]): void;
  scheduleOnce(...args: unknown[]): EmberRunTimer;
  run<T>(fn: () => T): T;
  schedule(queueName: string, target: object | null, method: (() => void) | string): EmberRunTimer;
  ensureInstance(): void;
  DEBUG: boolean;
  getDebugInfo(): DebugInfo;
}
