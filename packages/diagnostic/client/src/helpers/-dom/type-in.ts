import getDescription from './-get-description.ts';
import { getElement } from './-get-element.ts';
import guardForMaxlength from './-guard-for-maxlength.ts';
import type { HelperContext } from './-helper-context.ts';
import { assertRenderContext } from './-helper-context.ts';
import isFormControl, { type FormControl } from './-is-form-control.ts';
import { type HTMLElementContentEditable, isContentEditable, isDocument, type Target } from './-target.ts';
import { fireEvent } from './fire-event.ts';
import { __focus__ } from './focus.ts';
import { withHooks } from './helper-hooks.ts';
import { __triggerKeyEvent__ } from './trigger-key-event.ts';

export interface Options {
  delay?: number;
}

/**
 * Mimics character by character entry into the target `input` or `textarea` element.
 *
 * Allows for simulation of slow entry by passing an optional millisecond delay
 * between key events.

 * The major difference between `typeIn` and `fillIn` is that `typeIn` triggers
 * keyboard events as well as `input` and `change`.
 * Typically this looks like `focus` -> `focusin` -> `keydown` -> `keypress` -> `keyup` -> `input` -> `change`
 * per character of the passed text (this may vary on some browsers).
 *
 * @public
 * @param {string|Element|IDOMElementDescriptor} target the element, selector, or descriptor to enter text into
 * @param {string} text the test to fill the element with
 * @param {Object} options {delay: x} (default 50) number of milliseconds to wait per keypress
 * @return {Promise<void>} resolves when the application is settled
 *
 * @example
 * <caption>
 *   Emulating typing in an input using `typeIn`
 * </caption>
 *
 * typeIn('input', 'hello world');
 */
export function typeIn<T extends HelperContext>(
  this: T,
  target: Target,
  text: string,
  options: Options = {}
): Promise<void> {
  return withHooks({
    scope: this,
    name: 'typeIn',
    render: true,
    args: [target, text, options],
    cb: async () => {
      if (!target) {
        throw new Error('Must pass an element, selector, or descriptor to `typeIn`.');
      }

      assertRenderContext(this);
      const element = getElement(target, this.element);

      if (!element) {
        const description = getDescription(target);
        throw new Error(`Element not found when calling \`typeIn('${description}')\``);
      }

      if (isDocument(element) || (!isFormControl(element) && !isContentEditable(element))) {
        throw new Error('`typeIn` is only usable on form controls or contenteditable elements.');
      }

      if (typeof text === 'undefined' || text === null) {
        throw new Error('Must provide `text` when calling `typeIn`.');
      }

      if (isFormControl(element)) {
        if (element.disabled) {
          throw new Error(`Can not \`typeIn\` disabled '${getDescription(target)}'.`);
        }

        if ('readOnly' in element && element.readOnly) {
          throw new Error(`Can not \`typeIn\` readonly '${getDescription(target)}'.`);
        }
      }

      const { delay = 50 } = options;

      await __focus__(this, element);
      await fillOut(this, element, text, delay);
      await fireEvent(this, element, 'change');
    },
  });
}

function fillOut(scope: HelperContext, element: FormControl | HTMLElementContentEditable, text: string, delay: number) {
  const inputFunctions = text.split('').map((character) => keyEntry(scope, element, character));
  return inputFunctions.reduce((currentPromise, func) => {
    return currentPromise.then(() => delayedExecute(delay)).then(func);
  }, Promise.resolve());
}

function keyEntry(
  scope: HelperContext,
  element: FormControl | HTMLElementContentEditable,
  character: string
): () => void {
  const shiftKey = character === character.toUpperCase() && character !== character.toLowerCase();
  const options = { shiftKey };
  const characterKey = character.toUpperCase();

  return function () {
    return Promise.resolve()
      .then(() => __triggerKeyEvent__(scope, element, 'keydown', characterKey, options))
      .then(() => __triggerKeyEvent__(scope, element, 'keypress', characterKey, options))
      .then(() => {
        if (isFormControl(element)) {
          const newValue = element.value + character;
          guardForMaxlength(element, newValue, 'typeIn');

          element.value = newValue;
        } else {
          const newValue = element.innerHTML + character;
          element.innerHTML = newValue;
        }
        return fireEvent(scope, element, 'input');
      })
      .then(() => __triggerKeyEvent__(scope, element, 'keyup', characterKey, options));
  };
}

function delayedExecute(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
