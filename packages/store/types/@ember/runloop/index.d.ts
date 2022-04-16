// Type definitions for non-npm package @ember/runloop 3.16
// Project: https://emberjs.com/api/ember/3.16/modules/@ember%2Frunloop
// Definitions by: Mike North <https://github.com/mike-north>
//                 Steve Calvert <https://github.com/scalvert>
//                 Chris Krycho <https://github.com/chriskrycho>
//                 Dan Freeman <https://github.com/dfreeman>
//                 James C. Davis <https://github.com/jamescdavis>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.7

import type { Backburner } from '@ember/runloop/-private/backburner';
import type { EmberRunQueues, RunMethod } from '@ember/runloop/-private/types';
import type { EmberRunTimer } from '@ember/runloop/types';

export interface RunNamespace {
  /**
   * Runs the passed target and method inside of a RunLoop, ensuring any
   * deferred actions including bindings and views updates are flushed at the
   * end.
   */
  <Ret>(method: (...args: unknown[]) => Ret): Ret;
  <Target, Ret>(target: Target, method: RunMethod<Target, Ret>, ...args: unknown[]): Ret;
  /**
   * If no run-loop is present, it creates a new one. If a run loop is
   * present it will queue itself to run on the existing run-loops action
   * queue.
   */
  join<Ret>(method: (...args: unknown[]) => Ret, ...args: unknown[]): Ret | undefined;
  join<Target, Ret>(target: Target, method: RunMethod<Target, Ret>, ...args: unknown[]): Ret | undefined;
  /**
   * Allows you to specify which context to call the specified function in while
   * adding the execution of that function to the Ember run loop. This ability
   * makes this method a great way to asynchronously integrate third-party libraries
   * into your Ember application.
   */
  bind<Target, Ret>(target: Target, method: RunMethod<Target, Ret>, ...args: unknown[]): (...args: unknown[]) => Ret;
  /**
   * Begins a new RunLoop. Any deferred actions invoked after the begin will
   * be buffered until you invoke a matching call to `run.end()`. This is
   * a lower-level way to use a RunLoop instead of using `run()`.
   */
  begin(): void;
  /**
   * Ends a RunLoop. This must be called sometime after you call
   * `run.begin()` to flush any deferred actions. This is a lower-level way
   * to use a RunLoop instead of using `run()`.
   */
  end(): void;
  /**
   * Adds the passed target/method and any optional arguments to the named
   * queue to be executed at the end of the RunLoop. If you have not already
   * started a RunLoop when calling this method one will be started for you
   * automatically.
   */
  schedule<Target>(queue: EmberRunQueues, target: Target, method: keyof Target, ...args: unknown[]): EmberRunTimer;
  schedule<Target>(queue: EmberRunQueues, target: Target, method: RunMethod<Target>, ...args: unknown[]): EmberRunTimer;
  schedule(queue: EmberRunQueues, method: (args: unknown[]) => unknown, ...args: unknown[]): EmberRunTimer;
  /**
   * Invokes the passed target/method and optional arguments after a specified
   * period of time. The last parameter of this method must always be a number
   * of milliseconds.
   */
  later(method: (...args: unknown[]) => unknown, wait: number): EmberRunTimer;
  later<Target>(target: Target, method: RunMethod<Target>, wait: number): EmberRunTimer;
  later<Target>(target: Target, method: RunMethod<Target>, arg0: unknown, wait: number): EmberRunTimer;
  later<Target>(target: Target, method: RunMethod<Target>, arg0: unknown, arg1: unknown, wait: number): EmberRunTimer;
  later<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    wait: number
  ): EmberRunTimer;
  later<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    arg3: unknown,
    wait: number
  ): EmberRunTimer;
  later<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    arg3: unknown,
    arg4: unknown,
    wait: number
  ): EmberRunTimer;
  later<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    arg3: unknown,
    arg4: unknown,
    arg5: unknown,
    wait: number
  ): EmberRunTimer;
  /**
   * Schedule a function to run one time during the current RunLoop. This is equivalent
   * to calling `scheduleOnce` with the "actions" queue.
   */
  once<Target>(target: Target, method: RunMethod<Target>, ...args: unknown[]): EmberRunTimer;
  /**
   * Schedules a function to run one time in a given queue of the current RunLoop.
   * Calling this method with the same queue/target/method combination will have
   * no effect (past the initial call).
   */
  scheduleOnce<Target>(
    queue: EmberRunQueues,
    target: Target,
    method: RunMethod<Target>,
    ...args: unknown[]
  ): EmberRunTimer;
  /**
   * Schedules an item to run from within a separate run loop, after
   * control has been returned to the system. This is equivalent to calling
   * `run.later` with a wait time of 1ms.
   */
  next<Target>(target: Target, method: RunMethod<Target>, ...args: unknown[]): EmberRunTimer;
  next(method: () => void, ...args: unknown[]): EmberRunTimer;

  /**
   * Cancels a scheduled item. Must be a value returned by `run.later()`,
   * `run.once()`, `run.scheduleOnce()`, `run.next()`, `run.debounce()`, or
   * `run.throttle()`.
   */
  cancel(timer: EmberRunTimer): boolean;
  /**
   * Delay calling the target method until the debounce period has elapsed
   * with no additional debounce calls. If `debounce` is called again before
   * the specified time has elapsed, the timer is reset and the entire period
   * must pass again before the target method is called.
   */
  debounce(method: (...args: unknown[]) => unknown, wait: number, immediate?: boolean): EmberRunTimer;
  debounce<Target>(target: Target, method: RunMethod<Target>, wait: number, immediate?: boolean): EmberRunTimer;
  debounce<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    wait: number,
    immediate?: boolean
  ): EmberRunTimer;
  debounce<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    wait: number,
    immediate?: boolean
  ): EmberRunTimer;
  debounce<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    wait: number,
    immediate?: boolean
  ): EmberRunTimer;
  debounce<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    arg3: unknown,
    wait: number,
    immediate?: boolean
  ): EmberRunTimer;
  debounce<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    arg3: unknown,
    arg4: unknown,
    wait: number,
    immediate?: boolean
  ): EmberRunTimer;
  debounce<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    arg3: unknown,
    arg4: unknown,
    arg5: unknown,
    wait: number,
    immediate?: boolean
  ): EmberRunTimer;
  /**
   * Ensure that the target method is never called more frequently than
   * the specified spacing period. The target method is called immediately.
   */
  throttle(method: (...args: unknown[]) => unknown, spacing: number, immediate?: boolean): EmberRunTimer;
  throttle<Target>(target: Target, method: RunMethod<Target>, spacing: number, immediate?: boolean): EmberRunTimer;
  throttle<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    spacing: number,
    immediate?: boolean
  ): EmberRunTimer;
  throttle<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    spacing: number,
    immediate?: boolean
  ): EmberRunTimer;
  throttle<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    spacing: number,
    immediate?: boolean
  ): EmberRunTimer;
  throttle<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    arg3: unknown,
    spacing: number,
    immediate?: boolean
  ): EmberRunTimer;
  throttle<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    arg3: unknown,
    arg4: unknown,
    spacing: number,
    immediate?: boolean
  ): EmberRunTimer;
  throttle<Target>(
    target: Target,
    method: RunMethod<Target>,
    arg0: unknown,
    arg1: unknown,
    arg2: unknown,
    arg3: unknown,
    arg4: unknown,
    arg5: unknown,
    spacing: number,
    immediate?: boolean
  ): EmberRunTimer;

  queues: EmberRunQueues[];
}

// necessary because our "run" is run.backburner
// which we use to avoid autorun triggering for Ember <= 3.4
// we can drop this and use run directly ~11/1/2019
export const _backburner: Backburner;
export const run: RunNamespace;
export const begin: typeof run.begin;
export const bind: typeof run.bind;
export const cancel: typeof run.cancel;
export const debounce: typeof run.debounce;
export const end: typeof run.end;
export const join: typeof run.join;
export const later: typeof run.later;
export const next: typeof run.next;
export const once: typeof run.once;
export const schedule: typeof run.schedule;
export const scheduleOnce: typeof run.scheduleOnce;
export const throttle: typeof run.throttle;
