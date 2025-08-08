import { module as _module, skip as _skip, test as _test, todo as _todo } from "./-define";
import type { Hooks, ModuleCallback, TestCallback, TestContext } from "./-types";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { StrictMode, type ReactNode } from "react";
import { setup } from "qunit-dom";

export interface ReactTestContext extends TestContext {
  [IsRenderingContext]: boolean;
  element: HTMLDivElement;
  root: Root;
  render(app: ReactNode): Promise<void>;
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
      flushSync(() => {
        this.root!.render(useStrict ? <StrictMode>{App}</StrictMode> : App);
      });
    };
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
