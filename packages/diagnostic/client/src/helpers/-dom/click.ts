import getDescription from './-get-description.ts';
import { getWindowOrElement } from './-get-window-or-element.ts';
import type { HelperContext } from './-helper-context.ts';
import { assertRenderContext } from './-helper-context.ts';
import isFormControl from './-is-form-control.ts';
import { isWindow, type Target } from './-target.ts';
import { fireEvent } from './fire-event.ts';
import { __focus__ } from './focus.ts';
import { withHooks } from './helper-hooks.ts';

const PRIMARY_BUTTON = 1 as const;
const MAIN_BUTTON_PRESSED = 0 as const;

/**
 * Represent a particular mouse button being clicked.
 * See https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons for available options.
 */
export const DEFAULT_CLICK_OPTIONS: {
  readonly buttons: 1;
  readonly button: 0;
} = {
  buttons: PRIMARY_BUTTON,
  button: MAIN_BUTTON_PRESSED,
} as const;

/**
  @private
  @param {Element} element the element to click on
  @param {MouseEventInit} options the options to be merged into the mouse events
  @return {Promise<Event | void>} resolves when settled
*/
export function __click__(
  scope: HelperContext,
  element: Element | Document | Window,
  options: MouseEventInit
): Promise<void> {
  return Promise.resolve()
    .then(() => fireEvent(scope, element, 'mousedown', options))
    .then((mouseDownEvent) =>
      !isWindow(element) && !mouseDownEvent?.defaultPrevented ? __focus__(scope, element) : Promise.resolve()
    )
    .then(() => fireEvent(scope, element, 'mouseup', options))
    .then(() => fireEvent(scope, element, 'click', options))
    .then(() => {
      return;
    }); // avoid leaking fireEvent return value;
}

/**
  Clicks on the specified target.

  Sends a number of events intending to simulate a "real" user clicking on an
  element.

  For non-focusable elements the following events are triggered (in order):

  - `mousedown`
  - `mouseup`
  - `click`

  For focusable (e.g. form control) elements the following events are triggered
  (in order):

  - `mousedown`
  - `focus`
  - `focusin`
  - `mouseup`
  - `click`

  The exact listing of events that are triggered may change over time as needed
  to continue to emulate how actual browsers handle clicking a given element.

  Use the `options` hash to change the parameters of the [MouseEvents](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent).
  You can use this to specify modifier keys as well.

  @public
  @param {string|Element|IDOMElementDescriptor} target the element, selector, or descriptor to click on
  @param {MouseEventInit} _options the options to be merged into the mouse events.
  @return {Promise<void>} resolves when settled

  @example
  <caption>
    Emulating clicking a button using `click`
  </caption>
  click('button');

  @example
  <caption>
    Emulating clicking a button and pressing the `shift` key simultaneously using `click` with `options`.
  </caption>

  click('button', { shiftKey: true });
*/
export function click<T extends HelperContext>(this: T, target: Target, _options: MouseEventInit = {}): Promise<void> {
  const options = { ...DEFAULT_CLICK_OPTIONS, ..._options };

  return withHooks({
    scope: this,
    name: 'click',
    render: true,
    args: [target, options],
    cb: () => {
      if (!target) {
        throw new Error('Must pass an element, selector, or descriptor to `click`.');
      }

      assertRenderContext(this);
      const element = getWindowOrElement(target, this.element);
      if (!element) {
        const description = getDescription(target);
        throw new Error(`Element not found when calling \`click('${description}')\`.`);
      }

      if (isFormControl(element) && element.disabled) {
        throw new Error(`Can not \`click\` disabled ${String(element)}`);
      }

      return __click__(this, element, options);
    },
  });
}
