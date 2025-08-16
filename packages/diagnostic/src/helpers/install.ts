import type { IDOMElementDescriptor } from 'dom-element-descriptors';

import { PublicTestInfo } from '../-define.ts';
import { assert } from '../-utils.ts';
import type { Diagnostic } from '../internals/diagnostic.ts';
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
import { TEST_CONTEXT, withHooks } from './-dom/helper-hooks.ts';
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
export function buildHelpers<
  T extends {
    element?: HTMLElement | null;
    [PublicTestInfo]: {
      id: string;
      name: string;
    };
  },
>(context: T, config?: HelperConfig): TestHelpers {
  const info = context[PublicTestInfo];
  const element = context.element ?? null;
  const scope = {
    element,
    config: config ?? DEFAULT_RENDER_CONFIG,
    // @ts-expect-error private API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert: context[TEST_CONTEXT] as Diagnostic<any>,
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
    rerender: () =>
      withHooks({
        scope,
        name: 'rerender',
        render: false,
        cb: scope.config.rerender,
      }),
    settled: () =>
      withHooks({
        scope,
        name: 'settled',
        render: false,
        cb: scope.config.settled,
      }),
    resumeTest: () => {
      assert('Testing has not been paused. There is nothing to resume.', !!resume);
      scope.assert.pushInteraction({ type: 'pauseTest', subtype: 'end', series: null });
      resume();
      // @ts-expect-error - this is a global variable that we set to resume the test
      globalThis.resumeTest = resume = undefined;
      // @ts-expect-error - this is a global variable that we set to resume the test
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      globalThis.pausedTests.delete(info.id);
    },
    pauseTest: () => {
      scope.assert.pushInteraction({ type: 'pauseTest', subtype: 'start', series: null });
      console.info(`Testing paused for test "${info.name}". Use \`resumeTest()\` to continue.`);
      // @ts-expect-error - this is a global variable that we set to resume the test
      globalThis.pausedTests ??= new Set<string>();
      // @ts-expect-error - this is a global variable that we set to resume the test
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      globalThis.pausedTests.add(info.id);

      return new Promise((resolve) => {
        resume = resolve;
        // @ts-expect-error - this is a global variable that we set to resume the test
        globalThis.resumeTest = helpers.resumeTest;
      });
    },
  } satisfies TestHelpers;

  return helpers;
}
