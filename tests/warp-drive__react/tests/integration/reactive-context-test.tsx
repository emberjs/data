/* eslint-disable no-console */
import { module, test } from "@warp-drive/diagnostic";
import { ReactiveContext } from "@warp-drive/react";
import { signal, memoized } from "@warp-drive/core/store/-private";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { useEffect, StrictMode, type ReactNode } from "react";
import type { TestContext } from "@warp-drive/diagnostic/-types";
import { DEBUG } from "@warp-drive/core/build-config/env";

class InnerTestClass {
  @signal innerValue = 42;
}

class ReactiveTestClass {
  @signal value = 0;

  @memoized
  get computedValue() {
    return this.value * this.nested.innerValue;
  }

  @signal nested = new InnerTestClass();
}

async function rerender() {
  // signal update
  await Promise.resolve();
  // render
  await Promise.resolve();
  // running of effects
  await Promise.resolve();
}

async function render(
  test: TestContext & { element?: HTMLDivElement; root?: Root },
  Component: ReactNode
): Promise<HTMLDivElement> {
  if (!test.element) {
    test.element = document.createElement("div");
    test.element.className = "react-test";
    const mainElement = document.getElementById("react-testing")!;
    mainElement.appendChild(test.element);
    test.root = createRoot(test.element);
  }

  flushSync(() => {
    test.root!.render(<StrictMode>{Component}</StrictMode>);
  });

  return test.element;
}

module("Integration | <ReactiveContext />", function () {
  test("it rerenders simple signals correctly", async function (assert) {
    let state: ReactiveTestClass = new ReactiveTestClass();
    function TestComponent() {
      return <div>{state.value}</div>;
    }

    const element = await render(
      this,
      <ReactiveContext>
        <TestComponent />
      </ReactiveContext>
    );

    assert.equal(element!.textContent, "0", "Initial value is rendered");
    assert.equal(state!.value, 0, "Initial value is set correctly");

    state!.value = 1;
    await rerender();

    assert.equal(element!.textContent, "1", "Updated value is rendered");
    assert.equal(state!.value, 1, "Updated value is set correctly");
  });

  test("it rerenders computed signals correctly", async function (assert) {
    let state: ReactiveTestClass = new ReactiveTestClass();
    function TestComponent() {
      return <div>{state.computedValue}</div>;
    }

    const element = await render(
      this,
      <ReactiveContext>
        <TestComponent />
      </ReactiveContext>
    );

    assert.equal(element!.textContent, "0", "Initial value is rendered");
    assert.equal(state!.computedValue, 0, "Initial value is set correctly");

    state!.value = 1;
    await rerender();

    assert.equal(element!.textContent, "42", "Updated value is rendered");
    assert.equal(state!.computedValue, 42, "Updated value is set correctly");
  });

  test("it rerenders nested signals correctly", async function (assert) {
    let state: ReactiveTestClass = new ReactiveTestClass();
    function TestComponent() {
      return <div>{state.nested.innerValue}</div>;
    }

    const element = await render(
      this,
      <ReactiveContext>
        <TestComponent />
      </ReactiveContext>
    );

    assert.equal(element!.textContent, "42", "Initial value is rendered");
    assert.equal(state!.nested.innerValue, 42, "Initial value is set correctly");

    state!.nested.innerValue = 420;
    await rerender();

    assert.equal(element!.textContent, "420", "Updated value is rendered");
    assert.equal(state!.nested.innerValue, 420, "Updated value is set correctly");
  });

  test("it works with effects", async function (assert) {
    const state: ReactiveTestClass = new ReactiveTestClass();

    function TestComponent() {
      useEffect(() => {
        assert.step(String(state.nested.innerValue));
      }, [state.nested.innerValue]);
      return <div>{state.value}</div>;
    }

    const element = await render(
      this,
      <ReactiveContext>
        <TestComponent />
      </ReactiveContext>
    );

    assert.equal(element!.textContent, "0", "Initial value is rendered");
    assert.equal(state!.value, 0, "Initial value is set correctly");
    // strict mode will call effect twice in development
    assert.verifySteps(
      DEBUG ? ["42", "42"] : ["42"],
      DEBUG ? "Effect runs twice on initial render in development mode" : "Effect runs on initial render"
    );

    state!.value = 1;
    await rerender();

    assert.equal(element!.textContent, "1", "Updated value is rendered");
    assert.equal(state!.value, 1, "Updated value is set correctly");
    assert.verifySteps([], "Effect does not run on unrelated state change");

    state!.nested.innerValue = 420;
    await rerender();

    assert.equal(element!.textContent, "1", "Value remains unchanged");
    assert.equal(state!.value, 1, "Value remains unchanged");
    assert.verifySteps(["420"], "Effect runs on nested state change");
  });
});
