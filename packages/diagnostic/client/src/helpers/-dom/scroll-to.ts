import type { IDOMElementDescriptor } from 'dom-element-descriptors';

import getDescription from './-get-description.ts';
import { getElement } from './-get-element.ts';
import { assertRenderContext, type HelperContext } from './-helper-context.ts';
import type { Target } from './-target.ts';
import { isDocument, isElement } from './-target.ts';
import { fireEvent } from './fire-event.ts';
import { withHooks } from './helper-hooks.ts';

function errorMessage(message: string, target: Target) {
  const description = getDescription(target);
  return `${message} when calling \`scrollTo('${description}')\`.`;
}

/**
  Scrolls DOM element, selector, or descriptor to the given coordinates.
  @public
  @param {string|HTMLElement|IDOMElementDescriptor} target the element, selector, or descriptor to trigger scroll on
  @param {Number} x x-coordinate
  @param {Number} y y-coordinate
  @return {Promise<void>} resolves when settled

  @example
  <caption>
    Scroll DOM element to specific coordinates
  </caption>

  scrollTo('#my-long-div', 0, 0); // scroll to top
  scrollTo('#my-long-div', 0, 100); // scroll down
*/
export function scrollTo<T extends HelperContext>(
  this: T,
  target: string | HTMLElement | IDOMElementDescriptor,
  x: number,
  y: number
): Promise<void> {
  return withHooks({
    scope: this,
    name: 'scrollTo',
    render: true,
    args: [target, x, y],
    cb: async () => {
      if (!target) {
        throw new Error('Must pass an element, selector, or descriptor to `scrollTo`.');
      }

      if (x === undefined || y === undefined) {
        throw new Error('Must pass both x and y coordinates to `scrollTo`.');
      }

      assertRenderContext(this);
      const element = getElement(target, this.element);
      if (!element) {
        throw new Error(errorMessage('Element not found', target));
      }

      if (!isElement(element)) {
        let nodeType: string;
        if (isDocument(element)) {
          nodeType = 'Document';
        } else {
          // This is an error check for non-typescript callers passing in the
          // wrong type for `target`, so we have to cast `element` (which is
          // `never` inside this block) to something that will allow us to
          // access `nodeType`.
          const notElement = element as { nodeType: string };
          nodeType = notElement.nodeType;
        }

        throw new Error(errorMessage(`"target" must be an element, but was a ${nodeType}`, target));
      }

      element.scrollTop = y;
      element.scrollLeft = x;

      await fireEvent(this, element, 'scroll');
    },
  });
}
