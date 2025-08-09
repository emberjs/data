import getDescription from './-get-description.ts';
import { getElement } from './-get-element.ts';
import guardForMaxlength from './-guard-for-maxlength.ts';
import type { HelperContext } from './-helper-context.ts';
import { assertRenderContext } from './-helper-context.ts';
import isFormControl, { type FormControl } from './-is-form-control.ts';
import { isContentEditable, type Target } from './-target.ts';
import { fireEvent } from './fire-event.ts';
import { __focus__ } from './focus.ts';
import { withHooks } from './helper-hooks.ts';

/**
  Fill the provided text into the `value` property (or set `.innerHTML` when
  the target is a content editable element) then trigger `change` and `input`
  events on the specified target.

  @public
  @param {string|Element|IDOMElementDescriptor} target the element, selector, or descriptor to enter text into
  @param {string} text the text to fill into the target element
  @return {Promise<void>} resolves when the application is settled

  @example
  <caption>
    Emulating filling an input with text using `fillIn`
  </caption>

  fillIn('input', 'hello world');
*/
export function fillIn<T extends HelperContext>(this: T, target: Target, text: string): Promise<void> {
  return withHooks({
    scope: this,
    name: 'fillIn',
    render: true,
    args: [target, text],
    cb: async () => {
      if (!target) {
        throw new Error('Must pass an element, selector, or descriptor to `fillIn`.');
      }

      assertRenderContext(this);
      const element = getElement(target, this.element) as Element | HTMLElement;
      if (!element) {
        const description = getDescription(target);
        throw new Error(`Element not found when calling \`fillIn('${description}')\`.`);
      }

      if (typeof text === 'undefined' || text === null) {
        throw new Error('Must provide `text` when calling `fillIn`.');
      }

      if (isFormControl(element)) {
        if (element.disabled) {
          throw new Error(`Can not \`fillIn\` disabled '${getDescription(target)}'.`);
        }

        if ('readOnly' in element && element.readOnly) {
          throw new Error(`Can not \`fillIn\` readonly '${getDescription(target)}'.`);
        }

        guardForMaxlength(element, text, 'fillIn');

        await __focus__(this, element);
        (element as FormControl).value = text;
      } else if (isContentEditable(element)) {
        await __focus__(this, element);
        element.innerHTML = text;
      } else {
        throw new Error('`fillIn` is only usable on form controls or contenteditable elements.');
      }

      await fireEvent(this, element, 'input');
      await fireEvent(this, element, 'change');
    },
  });
}
