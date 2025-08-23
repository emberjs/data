import getDescription from './-get-description.ts';
import { getElement } from './-get-element.ts';
import type { HelperContext } from './-helper-context.ts';
import { assertRenderContext } from './-helper-context.ts';
import isFocusable from './-is-focusable.ts';
import { isDocument, type Target } from './-target.ts';
import { __blur__ } from './blur.ts';
import { fireEvent } from './fire-event.ts';
import { withHooks } from './helper-hooks.ts';

/**
   Get the closest focusable ancestor of a given element (or the element itself
   if it's focusable)

   @private
   @param {Element} element the element to trigger events on
   @returns {HTMLElement|SVGElement|null} the focusable element/ancestor or null
   if there is none
 */
function getClosestFocusable(element: HTMLElement | Element | Document | SVGElement): HTMLElement | SVGElement | null {
  if (isDocument(element)) {
    return null;
  }

  let maybeFocusable: Element | null = element;
  while (maybeFocusable && !isFocusable(maybeFocusable)) {
    maybeFocusable = maybeFocusable.parentElement;
  }

  return maybeFocusable;
}

/**
  @private
  @param element the element to trigger events on
  @return resolves when settled
*/
export function __focus__(scope: HelperContext, element: HTMLElement | Element | Document | SVGElement): Promise<void> {
  return scope.config.render(() => {
    return Promise.resolve()
      .then(() => {
        const focusTarget = getClosestFocusable(element);

        const previousFocusedElement =
          document.activeElement && document.activeElement !== focusTarget && isFocusable(document.activeElement)
            ? document.activeElement
            : null;

        // fire __blur__ manually with the null relatedTarget when the target is not focusable
        // and there was a previously focused element
        return !focusTarget && previousFocusedElement
          ? __blur__(scope, previousFocusedElement, null).then(() =>
              Promise.resolve({ focusTarget, previousFocusedElement })
            )
          : Promise.resolve({ focusTarget, previousFocusedElement });
      })
      .then(({ focusTarget, previousFocusedElement }) => {
        if (!focusTarget) {
          throw new Error('There was a previously focused element');
        }

        const browserIsNotFocused = !document?.hasFocus();

        // fire __blur__ manually with the correct relatedTarget when the browser is not
        // already in focus and there was a previously focused element
        return previousFocusedElement && browserIsNotFocused
          ? __blur__(scope, previousFocusedElement, focusTarget).then(() => Promise.resolve({ focusTarget }))
          : Promise.resolve({ focusTarget });
      })
      .then(({ focusTarget }) => {
        // makes `document.activeElement` be `element`. If the browser is focused, it also fires a focus event
        focusTarget.focus();

        // Firefox does not trigger the `focusin` event if the window
        // does not have focus. If the document does not have focus then
        // fire `focusin` event as well.
        const browserIsFocused = document?.hasFocus();
        return browserIsFocused
          ? Promise.resolve()
          : // if the browser is not focused the previous `el.focus()` didn't fire an event, so we simulate it
            Promise.resolve()
              .then(() =>
                fireEvent(scope, focusTarget, 'focus', {
                  bubbles: false,
                })
              )
              .then(() => fireEvent(scope, focusTarget, 'focusin'))
              .then(() => {
                return;
              }); // avoid leaking fireEvent return value;
      })
      .catch(() => {});
  });
}

/**
  Focus the specified target.

  Sends a number of events intending to simulate a "real" user focusing an
  element.

  The following events are triggered (in order):

  - `focus`
  - `focusin`

  The exact listing of events that are triggered may change over time as needed
  to continue to emulate how actual browsers handle focusing a given element.

  @public
  @param {string|Element|IDOMElementDescriptor} target the element, selector, or descriptor to focus
  @return {Promise<void>} resolves when the application is settled

  @example
  <caption>
    Emulating focusing an input using `focus`
  </caption>

  focus('input');
*/
export function focus<T extends HelperContext>(this: T, target: Target): Promise<void> {
  return withHooks({
    scope: this,
    name: 'focus',
    render: true,
    args: [target],
    cb: async () => {
      if (!target) {
        throw new Error('Must pass an element, selector, or descriptor to `focus`.');
      }

      assertRenderContext(this);
      const element = getElement(target, this.element);
      if (!element) {
        const description = getDescription(target);
        throw new Error(`Element not found when calling \`focus('${description}')\`.`);
      }

      if (!isFocusable(element)) {
        throw new Error(`${String(element)} is not focusable`);
      }

      return __focus__(this, element);
    },
  });
}
