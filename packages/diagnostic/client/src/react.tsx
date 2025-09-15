import { module as _module, skip as _skip, test as _test, todo as _todo } from "./-define";
import type { Hooks, ModuleCallback, TestCallback, TestContext } from "./-types";
import { createRoot, type Root } from "react-dom/client";
import { StrictMode, type ReactNode } from "react";
import { setup } from "qunit-dom";
import { buildHelpers, TestHelpers } from "./helpers/install";
import { flushSync } from "react-dom";
import { SpecTestContext } from "./spec";
import { settled } from "@warp-drive/react/install";

const act = async (fn: () => void | Promise<void>) => {
  await flushSync(fn);

  // make extra sure we caught everything since
  // in prod builds we don't use react-act
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

export interface ReactTestContext extends TestContext {
  [IsRenderingContext]: boolean;
  element: HTMLDivElement;
  root: Root;
  render(app: ReactNode): Promise<void>;
  h: TestHelpers;
}

export const IsRenderingContext: unique symbol = Symbol("isRenderingContext");

export function module<TC extends ReactTestContext = ReactTestContext>(name: string, cb: ModuleCallback<TC>): void {
  return _module<TC>(name, cb);
}

export function test<TC extends ReactTestContext = ReactTestContext>(name: string, cb: TestCallback<TC>): void {
  return _test(name, cb);
}

export function skip<TC extends ReactTestContext = ReactTestContext>(name: string, cb: TestCallback<TC>): void {
  return _skip(name, cb);
}

export function todo<TC extends ReactTestContext = ReactTestContext>(name: string, cb: TestCallback<TC>): void {
  return _todo(name, cb);
}

export interface SetupContextOptions {
  /**
   * The root element in which to create the test container.
   * Defaults to the element with id "react-testing".
   */
  rootElement?: HTMLDivElement;
  /**
   * Whether to use StrictMode for the tests.
   * Defaults to true.
   */
  strictMode?: boolean;
}

declare module "./-types" {
  interface Diagnostic {
    dom: Assert["dom"];
  }
}

// we do not use act because React incorrectly thinks updates can only come from internal
// to itself when using it. TL;DR react never expects to be embedded or for external
// reactive updates to occur.
//
// ts-expect-error This is a private property used by the test framework
// globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export function setupTest<TC extends ReactTestContext>(hooks: Hooks<TC>, options?: SetupContextOptions): void {
  hooks.beforeEach(async function (assert) {
    this.element = document.createElement("div");
    this.element.className = "react-test-container";
    const rootElement = options?.rootElement ?? document.getElementById("react-testing");
    const useStrict = options?.strictMode === false ? false : true;

    if (!rootElement) {
      throw new Error("No root element found for rendering tests.");
    }

    rootElement.appendChild(this.element);
    this.root = createRoot(this.element);

    setup(assert);
    // @ts-expect-error this is private
    assert.dom.rootElement = rootElement;

    this.render = async (App: ReactNode) => {
      await act(async () => {
        this.root!.render(useStrict ? <StrictMode>{App}</StrictMode> : App);
      });
    };

    let helpers: TestHelpers | null = null;
    Object.defineProperty(this, "h", {
      configurable: true,
      enumerable: true,
      get() {
        if (!helpers) {
          helpers = buildHelpers(this, {
            render: async <T,>(fn: () => T): Promise<Awaited<T>> => {
              let result: Awaited<T>;
              await act(async () => {
                result = await fn();
              });
              return result!;
            },
            rerender: async () => {
              await act(async () => {});
            },
            settled: async () => {
              await settled();
              await act(async () => {});
            },
          });
        }
        return helpers;
      },
    });
  });

  hooks.afterEach(function () {
    this.element.remove();
    this.root.unmount();
    // @ts-expect-error Reset the context
    this.element = null;
    // @ts-expect-error Reset the context
    this.root = undefined;
  });
}

export function useReact(): { name: "react"; setup<TC extends SpecTestContext<object>>(hooks: Hooks<TC>): void } {
  return {
    name: "react",
    setup: setupTest,
  } as { name: "react"; setup<TC extends SpecTestContext<object>>(hooks: Hooks<TC>): void };
}
