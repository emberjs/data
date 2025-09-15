import getDescription from './-get-description.ts';
import { getWindowOrElement } from './-get-window-or-element.ts';
import type { HelperContext } from './-helper-context.ts';
import { assertRenderContext } from './-helper-context.ts';
import isFormControl from './-is-form-control.ts';
import { isWindow, type Target } from './-target.ts';
import { DEFAULT_CLICK_OPTIONS } from './click.ts';
import { fireEvent } from './fire-event.ts';
import { __focus__ } from './focus.ts';
import { withHooks } from './helper-hooks.ts';

/**
  @private
  @param {Element} element the element to double-click on
  @param {MouseEventInit} options the options to be merged into the mouse events
  @returns {Promise<void>} resolves when settled
*/
export function __doubleClick__(
  scope: HelperContext,
  element: Element | Document | Window,
  options: MouseEventInit
): Promise<void> {
  return Promise.resolve()
    .then(() => fireEvent(scope, element, 'mousedown', options))
    .then((mouseDownEvent) => {
      return !isWindow(element) && !mouseDownEvent?.defaultPrevented ? __focus__(scope, element) : Promise.resolve();
    })
    .then(() => fireEvent(scope, element, 'mouseup', options))
    .then(() => fireEvent(scope, element, 'click', options))
    .then(() => fireEvent(scope, element, 'mousedown', options))
    .then(() => fireEvent(scope, element, 'mouseup', options))
    .then(() => fireEvent(scope, element, 'click', options))
    .then(() => fireEvent(scope, element, 'dblclick', options))
    .then(() => {
      return;
    }); // avoid leaking fireEvent return value;
}

/**
  Double-clicks on the specified target.

  Sends a number of events intending to simulate a "real" user clicking on an
  element.

  For non-focusable elements the following events are triggered (in order):

  - `mousedown`
  - `mouseup`
  - `click`
  - `mousedown`
  - `mouseup`
  - `click`
  - `dblclick`

  For focusable (e.g. form control) elements the following events are triggered
  (in order):

  - `mousedown`
  - `focus`
  - `focusin`
  - `mouseup`
  - `click`
  - `mousedown`
  - `mouseup`
  - `click`
  - `dblclick`

  The exact listing of events that are triggered may change over time as needed
  to continue to emulate how actual browsers handle clicking a given element.

  Use the `options` hash to change the parameters of the [MouseEvents](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent).

  @public
  @param {string|Element|IDOMElementDescriptor} target the element, selector, or descriptor to double-click on
  @param {MouseEventInit} _options the options to be merged into the mouse events
  @return {Promise<void>} resolves when settled

  @example
  <caption>
    Emulating double clicking a button using `doubleClick`
  </caption>

  doubleClick('button');

  @example
  <caption>
    Emulating double clicking a button and pressing the `shift` key simultaneously using `click` with `options`.
  </caption>

  doubleClick('button', { shiftKey: true });
*/
export function doubleClick<T extends HelperContext>(
  this: T,
  target: Target,
  _options: MouseEventInit = {}
): Promise<void> {
  const options = { ...DEFAULT_CLICK_OPTIONS, ..._options };

  return withHooks({
    scope: this,
    name: 'doubleClick',
    render: true,
    args: [target, _options],
    cb: () => {
      if (!target) {
        throw new Error('Must pass an element, selector, or descriptor to `doubleClick`.');
      }

      assertRenderContext(this);
      const element = getWindowOrElement(target, this.element);
      if (!element) {
        const description = getDescription(target);
        throw new Error(`Element not found when calling \`doubleClick('${description}')\`.`);
      }

      if (isFormControl(element) && element.disabled) {
        throw new Error(`Can not \`doubleClick\` disabled ${String(element)}`);
      }

      return __doubleClick__(this, element, options);
    },
  });
}
