/* eslint-disable no-console */
import { module, test } from "@warp-drive/diagnostic";
import { ReactiveContext } from "@warp-drive/react";
import { signal, memoized } from "@warp-drive/core/store/-private";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { StrictMode, type ReactNode } from "react";

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

async function render(test: { element?: HTMLDivElement; root?: Root }, Component: ReactNode): Promise<void> {
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
}

module("Integration | <ReactiveContext />", function (hooks) {
  test("it rerenders simple signals correctly", async function (assert) {
    const state = new ReactiveTestClass();

    await render(this, <ReactiveContext>{state.value}</ReactiveContext>);

    assert.equal(this.element!.textContent, "0", "Initial value is rendered");

    state.value = 1;
    await Promise.resolve();

    assert.equal(this.element!.textContent, "1", "Updated value is rendered");
  });
});
