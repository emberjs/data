import getDescription from './-get-description.ts';
import { getElement } from './-get-element.ts';
import type { HelperContext } from './-helper-context.ts';
import { assertRenderContext } from './-helper-context.ts';
import isFormControl from './-is-form-control.ts';
import type { Target } from './-target.ts';
import { isNumeric } from './-utils.ts';
import { fireEvent } from './fire-event.ts';
import { isKeyboardEventType, KEYBOARD_EVENT_TYPES, type KeyboardEventType } from './fire-event.ts';
import { withHooks } from './helper-hooks.ts';

export interface KeyModifiers {
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

const DEFAULT_MODIFIERS: KeyModifiers = Object.freeze({
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
});

// This is not a comprehensive list, but it is better than nothing.
const keyFromKeyCode: { [key: number]: string } = {
  8: 'Backspace',
  9: 'Tab',
  13: 'Enter',
  16: 'Shift',
  17: 'Control',
  18: 'Alt',
  20: 'CapsLock',
  27: 'Escape',
  32: ' ',
  37: 'ArrowLeft',
  38: 'ArrowUp',
  39: 'ArrowRight',
  40: 'ArrowDown',
  48: '0',
  49: '1',
  50: '2',
  51: '3',
  52: '4',
  53: '5',
  54: '6',
  55: '7',
  56: '8',
  57: '9',
  65: 'a',
  66: 'b',
  67: 'c',
  68: 'd',
  69: 'e',
  70: 'f',
  71: 'g',
  72: 'h',
  73: 'i',
  74: 'j',
  75: 'k',
  76: 'l',
  77: 'm',
  78: 'n',
  79: 'o',
  80: 'p',
  81: 'q',
  82: 'r',
  83: 's',
  84: 't',
  85: 'u',
  86: 'v',
  87: 'w',
  88: 'x',
  89: 'y',
  90: 'z',
  91: 'Meta',
  93: 'Meta', // There is two keys that map to meta,
  186: ';',
  187: '=',
  188: ',',
  189: '-',
  190: '.',
  191: '/',
  219: '[',
  220: '\\',
  221: ']',
  222: "'",
};

const keyFromKeyCodeWithShift: { [key: number]: string } = {
  48: ')',
  49: '!',
  50: '@',
  51: '#',
  52: '$',
  53: '%',
  54: '^',
  55: '&',
  56: '*',
  57: '(',
  186: ':',
  187: '+',
  188: '<',
  189: '_',
  190: '>',
  191: '?',
  219: '{',
  220: '|',
  221: '}',
  222: '"',
};

/**
  Calculates the value of KeyboardEvent#key given a keycode and the modifiers.
  Note that this works if the key is pressed in combination with the shift key, but it cannot
  detect if caps lock is enabled.
  @param {number} keycode The keycode of the event.
  @param {object} modifiers The modifiers of the event.
  @returns {string} The key string for the event.
 */
function keyFromKeyCodeAndModifiers(keycode: number, modifiers: KeyModifiers): string | void {
  if (keycode > 64 && keycode < 91) {
    if (modifiers.shiftKey) {
      return String.fromCharCode(keycode);
    } else {
      return String.fromCharCode(keycode).toLocaleLowerCase();
    }
  }

  return (modifiers.shiftKey && keyFromKeyCodeWithShift[keycode]) || keyFromKeyCode[keycode];
}

/**
 * Infers the keycode from the given key
 * @param {string} key The KeyboardEvent#key string
 * @returns {number} The keycode for the given key
 */
function keyCodeFromKey(key: string) {
  const keys = Object.keys(keyFromKeyCode);
  const keyCode =
    keys.find((code: string) => keyFromKeyCode[Number(code)] === key) ||
    keys.find((code: string) => keyFromKeyCode[Number(code)] === key.toLowerCase());

  return keyCode !== undefined ? parseInt(keyCode) : undefined;
}

/**
  @private
  @param {Element | Document} element the element to trigger the key event on
  @param {'keydown' | 'keyup' | 'keypress'} eventType the type of event to trigger
  @param {number|string} key the `keyCode`(number) or `key`(string) of the event being triggered
  @param {Object} [modifiers] the state of various modifier keys
  @return {Promise<Event>} resolves when settled
 */
export function __triggerKeyEvent__(
  scope: HelperContext,
  element: Element | Document,
  eventType: KeyboardEventType,
  key: number | string,
  modifiers: KeyModifiers = DEFAULT_MODIFIERS
): Promise<Event> {
  return Promise.resolve().then(() => {
    let props;
    if (typeof key === 'number') {
      props = {
        keyCode: key,
        which: key,
        key: keyFromKeyCodeAndModifiers(key, modifiers),
        ...modifiers,
      };
    } else if (typeof key === 'string' && key.length !== 0) {
      const firstCharacter = key[0];
      if (!firstCharacter || firstCharacter !== firstCharacter.toUpperCase()) {
        throw new Error(
          `Must provide a \`key\` to \`triggerKeyEvent\` that starts with an uppercase character but you passed \`${key}\`.`
        );
      }

      if (isNumeric(key) && key.length > 1) {
        throw new Error(
          `Must provide a numeric \`keyCode\` to \`triggerKeyEvent\` but you passed \`${key}\` as a string.`
        );
      }

      const keyCode = keyCodeFromKey(key);
      props = { keyCode, which: keyCode, key, ...modifiers };
    } else {
      throw new Error(`Must provide a \`key\` or \`keyCode\` to \`triggerKeyEvent\``);
    }

    return fireEvent(scope, element, eventType, props);
  });
}

/**
  Triggers a keyboard event of given type in the target element.
  It also requires the developer to provide either a string with the [`key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values)
  or the numeric [`keyCode`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode) of the pressed key.
  Optionally the user can also provide a POJO with extra modifiers for the event.

  @public
  @param {string|Element|IDOMElementDescriptor} target the element, selector, or descriptor to trigger the event on
  @param {'keydown' | 'keyup' | 'keypress'} eventType the type of event to trigger
  @param {number|string} key the `keyCode`(number) or `key`(string) of the event being triggered
  @param {Object} [modifiers] the state of various modifier keys
  @param {boolean} [modifiers.ctrlKey=false] if true the generated event will indicate the control key was pressed during the key event
  @param {boolean} [modifiers.altKey=false] if true the generated event will indicate the alt key was pressed during the key event
  @param {boolean} [modifiers.shiftKey=false] if true the generated event will indicate the shift key was pressed during the key event
  @param {boolean} [modifiers.metaKey=false] if true the generated event will indicate the meta key was pressed during the key event
  @return {Promise<void>} resolves when the application is settled unless awaitSettled is false

  @example
  <caption>
    Emulating pressing the `ENTER` key on a button using `triggerKeyEvent`
  </caption>
  triggerKeyEvent('button', 'keydown', 'Enter');
*/
export function triggerKeyEvent<T extends HelperContext>(
  this: T,
  target: Target,
  eventType: KeyboardEventType,
  key: number | string,
  modifiers: KeyModifiers = DEFAULT_MODIFIERS
): Promise<void> {
  return withHooks({
    scope: this,
    name: 'triggerKeyEvent',
    render: true,
    args: [target, eventType, key, modifiers],
    cb: async () => {
      if (!target) {
        throw new Error('Must pass an element, selector, or descriptor to `triggerKeyEvent`.');
      }

      assertRenderContext(this);
      const element = getElement(target, this.element);
      if (!element) {
        const description = getDescription(target);
        throw new Error(`Element not found when calling \`triggerKeyEvent('${description}')\`.`);
      }

      if (!eventType) {
        throw new Error(`Must provide an \`eventType\` to \`triggerKeyEvent\``);
      }

      if (!isKeyboardEventType(eventType)) {
        const validEventTypes = KEYBOARD_EVENT_TYPES.join(', ');
        throw new Error(
          `Must provide an \`eventType\` of ${validEventTypes} to \`triggerKeyEvent\` but you passed \`${String(eventType)}\`.`
        );
      }

      if (isFormControl(element) && element.disabled) {
        throw new Error(`Can not \`triggerKeyEvent\` on disabled ${String(element)}`);
      }

      await __triggerKeyEvent__(this, element, eventType, key, modifiers);
    },
  });
}
