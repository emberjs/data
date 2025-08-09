/**
 * The public API for the test context, which test authors can depend on being
 * available.
 *
 * Note: this is *not* user-constructible; it becomes available by calling
 * `setupContext()` with a base context object.
 */
export interface HelperContext {
  element: HTMLElement | null;
  config: HelperConfig;
}

export interface HelperConfig {
  render<T>(fn: () => T): Promise<Awaited<T>>;
  rerender: () => Promise<void>;
  settled: () => Promise<void>;
}

export function assertRenderContext<T>(context: T): asserts context is T & { element: HTMLElement } {
  const element = (
    context as {
      element?: HTMLElement | null;
    }
  ).element;
  if (!element || !(element instanceof HTMLElement)) {
    throw new Error('[TestHelper Error] No `element` was provided on the test context.');
  }
}
