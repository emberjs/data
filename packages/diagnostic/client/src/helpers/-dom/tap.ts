import getDescription from './-get-description.ts';
import { getElement } from './-get-element.ts';
import { assertRenderContext, type HelperContext } from './-helper-context.ts';
import isFormControl from './-is-form-control.ts';
import type { Target } from './-target.ts';
import { __click__ } from './click.ts';
import { fireEvent } from './fire-event.ts';
import { withHooks } from './helper-hooks.ts';

/**
  Taps on the specified target.

  Sends a number of events intending to simulate a "real" user tapping on an
  element.

  For non-focusable elements the following events are triggered (in order):

  - `touchstart`
  - `touchend`
  - `mousedown`
  - `mouseup`
  - `click`

  For focusable (e.g. form control) elements the following events are triggered
  (in order):

  - `touchstart`
  - `touchend`
  - `mousedown`
  - `focus`
  - `focusin`
  - `mouseup`
  - `click`

  The exact listing of events that are triggered may change over time as needed
  to continue to emulate how actual browsers handle tapping on a given element.

  Use the `options` hash to change the parameters of the tap events.

  @public
  @param {string|Element|IDOMElementDescriptor} target the element, selector, or descriptor to tap on
  @param {Object} options the options to be merged into the touch events
  @return {Promise<void>} resolves when settled

  @example
  <caption>
    Emulating tapping a button using `tap`
  </caption>

  tap('button');
*/
export function tap<T extends HelperContext>(this: T, target: Target, options: TouchEventInit = {}): Promise<void> {
  return withHooks({
    scope: this,
    name: 'tap',
    render: true,
    args: [target, options],
    cb: async () => {
      if (!target) {
        throw new Error('Must pass an element, selector, or descriptor to `tap`.');
      }

      assertRenderContext(this);
      const element = getElement(target, this.element);
      if (!element) {
        const description = getDescription(target);
        throw new Error(`Element not found when calling \`tap('${description}')\`.`);
      }

      if (isFormControl(element) && element.disabled) {
        throw new Error(`Can not \`tap\` disabled ${String(element)}`);
      }

      const touchStartEv = await fireEvent(this, element, 'touchstart', options);
      const touchEndEv = await fireEvent(this, element, 'touchend', options);

      if (!touchStartEv.defaultPrevented && !touchEndEv.defaultPrevented) {
        await __click__(this, element, options);
      }
    },
  });
}
