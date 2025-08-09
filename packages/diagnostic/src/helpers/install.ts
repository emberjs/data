import type { IDOMElementDescriptor } from 'dom-element-descriptors';

import { assert } from '../-utils.ts';
import type { HelperConfig } from './-dom/-helper-context.ts';
import type { Target } from './-dom/-target.ts';
import { blur } from './-dom/blur.ts';
import { click } from './-dom/click.ts';
import { doubleClick } from './-dom/double-click.ts';
import { fillIn } from './-dom/fill-in.ts';
import { find } from './-dom/find.ts';
import { findAll } from './-dom/find-all.ts';
import type { KeyboardEventType } from './-dom/fire-event.ts';
import { focus } from './-dom/focus.ts';
import { scrollTo } from './-dom/scroll-to.ts';
import { select } from './-dom/select.ts';
import { tab } from './-dom/tab.ts';
import { tap } from './-dom/tap.ts';
import { triggerEvent } from './-dom/trigger-event.ts';
import type { KeyModifiers } from './-dom/trigger-key-event.ts';
import { triggerKeyEvent } from './-dom/trigger-key-event.ts';
import type { Options as TypeInOptions } from './-dom/type-in.ts';
import { typeIn } from './-dom/type-in.ts';
import type { Options as WaitForOptions } from './-dom/wait-for.ts';
import { waitFor } from './-dom/wait-for.ts';
import type { Falsy, Options as WaitUntilOptions } from './-dom/wait-until.ts';
import { waitUntil } from './-dom/wait-until.ts';

export interface TestHelpers {
  blur(target?: Target): Promise<void>;
  click(target: Target, options?: MouseEventInit): Promise<void>;
  doubleClick(target: Target, options?: MouseEventInit): Promise<void>;
  fillIn(target: Target, text: string): Promise<void>;

  findAll<K extends keyof (HTMLElementTagNameMap | SVGElementTagNameMap)>(
    selector: K
  ): Array<HTMLElementTagNameMap[K] | SVGElementTagNameMap[K]>;
  findAll<K extends keyof HTMLElementTagNameMap>(selector: K): Array<HTMLElementTagNameMap[K]>;
  findAll<K extends keyof SVGElementTagNameMap>(selector: K): Array<SVGElementTagNameMap[K]>;
  findAll(selector: string): Element[];

  focus(target: Target): Promise<void>;

  find<K extends keyof (HTMLElementTagNameMap | SVGElementTagNameMap)>(
    selector: K
  ): HTMLElementTagNameMap[K] | SVGElementTagNameMap[K] | null;
  find<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K] | null;
  find<K extends keyof SVGElementTagNameMap>(selector: K): SVGElementTagNameMap[K] | null;
  find(selector: string): Element | null;

  scrollTo(target: string | HTMLElement | IDOMElementDescriptor, x: number, y: number): Promise<void>;
  select(target: Target, options: string | string[], keepPreviouslySelected?: boolean): Promise<void>;
  tab(options?: { backwards?: boolean; unRestrainTabIndex?: boolean }): Promise<void>;
  tap(target: Target, options?: TouchEventInit): Promise<void>;
  triggerEvent(target: Target, eventType: string, options?: Record<string, unknown>): Promise<void>;
  triggerKeyEvent(
    target: Target,
    eventType: KeyboardEventType,
    key: number | string,
    modifiers?: KeyModifiers
  ): Promise<void>;
  typeIn(target: Target, text: string, options?: TypeInOptions): Promise<void>;
  waitFor(target: string | IDOMElementDescriptor, options?: WaitForOptions): Promise<Element | Element[]>;
  waitUntil<T>(callback: () => T | void | Falsy, options?: WaitUntilOptions): Promise<T>;
  rerender: () => Promise<void>;
  settled: () => Promise<void>;
  pauseTest(): Promise<void>;
  resumeTest(): void;
}

const DEFAULT_RENDER_CONFIG = {
  render: async <T>(fn: () => T): Promise<Awaited<T>> => {
    return await fn();
  },
  rerender: async () => {
    // let any initial things scheduled complete
    await Promise.resolve();
    // bounce over any work that then got done
    await Promise.resolve();
    // a last bounce for good measure
    await Promise.resolve();
  },
  settled: async () => {
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 0);
      });
    });
  },
};

/**
  Used by test frameworks to setup the provided context for testing.

  @public
*/
export function buildHelpers<T extends { element?: HTMLElement | null }>(
  context: T,
  config?: HelperConfig
): TestHelpers {
  const element = context.element ?? null;
  const scope = {
    element,
    config: config ?? DEFAULT_RENDER_CONFIG,
  };
  let resume: ((value?: void | PromiseLike<void>) => void) | undefined;

  const helpers = {
    blur: blur.bind(scope),
    click: click.bind(scope),
    doubleClick: doubleClick.bind(scope),
    fillIn: fillIn.bind(scope),
    findAll: findAll.bind(scope),
    find: find.bind(scope),
    focus: focus.bind(scope),
    scrollTo: scrollTo.bind(scope),
    select: select.bind(scope),
    tab: tab.bind(scope),
    tap: tap.bind(scope),
    triggerEvent: triggerEvent.bind(scope),
    triggerKeyEvent: triggerKeyEvent.bind(scope),
    typeIn: typeIn.bind(scope),
    waitFor: waitFor.bind(scope),
    waitUntil: waitUntil.bind(scope),
    rerender: scope.config.rerender,
    settled: scope.config.settled,
    resumeTest: () => {
      assert('Testing has not been paused. There is nothing to resume.', !!resume);
      resume();
      // @ts-expect-error - this is a global variable that we set to resume the test
      globalThis.resumeTest = resume = undefined;
    },
    pauseTest: () => {
      console.info('Testing paused. Use `resumeTest()` to continue.');

      return new Promise((resolve) => {
        resume = resolve;
        // @ts-expect-error - this is a global variable that we set to resume the test

        globalThis.resumeTest = helpers.resumeTest;
      });
    },
  } satisfies TestHelpers;

  return helpers;
}
