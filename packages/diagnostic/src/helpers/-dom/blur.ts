import getDescription from './-get-description.ts';
import { getElement } from './-get-element.ts';
import { assertRenderContext, type HelperContext } from './-helper-context.ts';
import isFocusable from './-is-focusable.ts';
import type { Target } from './-target.ts';
import { fireEvent } from './fire-event.ts';
import { withHooks } from './helper-hooks.ts';

/**
  @private
  @param {Element} element the element to trigger events on
  @param {Element} relatedTarget the element that is focused after blur
  @return {Promise<Event | void>} resolves when settled
*/
export function __blur__(
  scope: HelperContext,
  element: HTMLElement | Element | Document | SVGElement,
  relatedTarget: HTMLElement | Element | Document | SVGElement | null = null
): Promise<void> {
  if (!isFocusable(element)) {
    throw new Error(`${String(element)} is not focusable`);
  }

  const browserIsNotFocused = document.hasFocus && !document.hasFocus();
  const needsCustomEventOptions = relatedTarget !== null;

  if (!needsCustomEventOptions) {
    // makes `document.activeElement` be `body`.
    // If the browser is focused, it also fires a blur event
    element.blur();
  }

  // Chrome/Firefox does not trigger the `blur` event if the window
  // does not have focus. If the document does not have focus then
  // fire `blur` event via native event.
  const options = { relatedTarget };
  return browserIsNotFocused || needsCustomEventOptions
    ? Promise.resolve()
        .then(() => fireEvent(scope, element, 'blur', { bubbles: false, ...options }))
        .then(() => fireEvent(scope, element, 'focusout', options))
        .then(() => {
          return;
        }) // avoid leaking fireEvent return value
    : Promise.resolve();
}

/**
  Unfocus the specified target.

  Sends a number of events intending to simulate a "real" user unfocusing an
  element.

  The following events are triggered (in order):

  - `blur`
  - `focusout`

  The exact listing of events that are triggered may change over time as needed
  to continue to emulate how actual browsers handle unfocusing a given element.

  @public
  @param {string|Element|IDOMElementDescriptor} [target=document.activeElement] the element, selector, or descriptor to unfocus
  @return {Promise<void>} resolves when settled

  @example
  <caption>
    Emulating blurring an input using `blur`
  </caption>

  blur('input');
*/
export function blur<T extends HelperContext>(this: T, target: Target = document.activeElement!): Promise<void> {
  return withHooks({
    scope: this,
    name: 'blur',
    render: true,
    args: [target],
    cb: () => {
      assertRenderContext(this);
      const element = getElement(target, this.element);
      if (!element) {
        const description = getDescription(target);
        throw new Error(`Element not found when calling \`blur('${description}')\`.`);
      }

      return __blur__(this, element);
    },
  });
}
