/* eslint-disable no-console */
import { module, test } from "@warp-drive/diagnostic";
import { ReactiveContext } from "@warp-drive/react";
import { signal, memoized } from "@warp-drive/core/store/-private";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { StrictMode, useRef, type ReactNode } from "react";

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
  await Promise.resolve();
  await Promise.resolve();
}

async function render(test: { element?: HTMLDivElement; root?: Root }, Component: ReactNode): Promise<HTMLDivElement> {
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

module("Integration | <ReactiveContext />", function (hooks) {
  test("it rerenders simple signals correctly", async function (assert) {
    let state: ReactiveTestClass | null = null;
    function TestComponent() {
      const ref = useRef<ReactiveTestClass>(null);
      if (!ref.current) {
        ref.current = new ReactiveTestClass();
      }
      state = ref.current;
      return <div>{state.value}</div>;
    }

    const element = await render(
      this,
      <ReactiveContext>
        <TestComponent />
      </ReactiveContext>
    );

    assert.true(state! instanceof ReactiveTestClass, "State is an instance of ReactiveTestClass");
    assert.equal(element!.textContent, "0", "Initial value is rendered");
    assert.equal(state!.value, 0, "Initial value is set correctly");

    state!.value = 1;
    console.log("state updated");
    await rerender();

    assert.equal(element!.textContent, "1", "Updated value is rendered");
    assert.equal(state!.value, 1, "Updated value is set correctly");
    console.log("test end");
  });
});
