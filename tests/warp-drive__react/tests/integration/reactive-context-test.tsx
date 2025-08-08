import { module, test, setupTest } from "@warp-drive/diagnostic/react";
import { maybeRerender } from "@warp-drive/diagnostic/react/test-helpers";
import { ReactiveContext } from "@warp-drive/react";
import { signal, memoized } from "@warp-drive/core/store/-private";
import { useEffect } from "react";
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

module("Integration | <ReactiveContext />", function (hooks) {
  setupTest(hooks);

  test("it rerenders simple signals correctly", async function (assert) {
    let state: ReactiveTestClass = new ReactiveTestClass();
    function TestComponent() {
      return <div>{state.value}</div>;
    }

    await this.render(
      <ReactiveContext>
        <TestComponent />
      </ReactiveContext>
    );

    assert.dom().hasText("0", "Initial value is rendered");
    assert.equal(state!.value, 0, "Initial value is set correctly");

    state!.value = 1;
    await maybeRerender();

    assert.dom().hasText("1", "Updated value is rendered");
    assert.equal(state!.value, 1, "Updated value is set correctly");
  });

  test("it rerenders computed signals correctly", async function (assert) {
    let state: ReactiveTestClass = new ReactiveTestClass();
    function TestComponent() {
      return <div>{state.computedValue}</div>;
    }

    await this.render(
      <ReactiveContext>
        <TestComponent />
      </ReactiveContext>
    );

    assert.dom().hasText("0", "Initial value is rendered");
    assert.equal(state!.computedValue, 0, "Initial value is set correctly");

    state!.value = 1;
    await maybeRerender();

    assert.dom().hasText("42", "Updated value is rendered");
    assert.equal(state!.computedValue, 42, "Updated value is set correctly");
  });

  test("it rerenders nested signals correctly", async function (assert) {
    let state: ReactiveTestClass = new ReactiveTestClass();
    function TestComponent() {
      return <div>{state.nested.innerValue}</div>;
    }

    await this.render(
      <ReactiveContext>
        <TestComponent />
      </ReactiveContext>
    );

    assert.dom().hasText("42", "Initial value is rendered");
    assert.equal(state!.nested.innerValue, 42, "Initial value is set correctly");

    state!.nested.innerValue = 420;
    await maybeRerender();

    assert.dom().hasText("420", "Updated value is rendered");
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

    await this.render(
      <ReactiveContext>
        <TestComponent />
      </ReactiveContext>
    );

    assert.dom().hasText("0", "Initial value is rendered");
    assert.equal(state!.value, 0, "Initial value is set correctly");
    // strict mode will call effect twice in development
    assert.verifySteps(
      DEBUG ? ["42", "42"] : ["42"],
      DEBUG ? "Effect runs twice on initial render in development mode" : "Effect runs on initial render"
    );

    state!.value = 1;
    await maybeRerender();

    assert.dom().hasText("1", "Updated value is rendered");
    assert.equal(state!.value, 1, "Updated value is set correctly");
    assert.verifySteps([], "Effect does not run on unrelated state change");

    state!.nested.innerValue = 420;
    await maybeRerender();

    assert.dom().hasText("1", "Value remains unchanged after nested state change");
    assert.equal(state!.value, 1, "Value remains unchanged");
    assert.verifySteps(["420"], "Effect runs on nested state change");
  });
});
