import { type IDOMElementDescriptor, lookupDescriptorData } from 'dom-element-descriptors';

import getDescription from './-get-description.ts';
import { getElement } from './-get-element.ts';
import getElements from './-get-elements.ts';
import { assertRenderContext, type HelperContext } from './-helper-context.ts';
import { withHooks } from './helper-hooks.ts';
import { waitUntil } from './wait-until.ts';

export interface Options {
  timeout?: number;
  count?: number | null;
  timeoutMessage?: string;
}

/**
  Used to wait for a particular selector to appear in the DOM. Due to the fact
  that it does not wait for general settledness, this is quite useful for testing
  interim DOM states (e.g. loading states, pending promises, etc).

  @param {string|IDOMElementDescriptor} target the selector or DOM element descriptor to wait for
  @param {Object} [options] the options to be used
  @param {number} [options.timeout=1000] the time to wait (in ms) for a match
  @param {number} [options.count=null] the number of elements that should match the provided selector (null means one or more)
  @return {Promise<Element|Element[]>} resolves when the element(s) appear on the page

  @example
  <caption>
    Waiting until a selector is rendered:
  </caption>
  await waitFor('.my-selector', { timeout: 2000 })
*/
export function waitFor<T extends HelperContext>(
  this: T,
  target: string | IDOMElementDescriptor,
  options: Options = {}
): Promise<Element | Element[]> {
  return withHooks({
    scope: this,
    name: 'waitFor',
    render: false,
    args: [target, options],
    cb: () => {
      if (typeof target !== 'string' && !lookupDescriptorData(target)) {
        throw new Error('Must pass a selector or DOM element descriptor to `waitFor`.');
      }

      assertRenderContext(this);
      const { timeout = 1000, count = null } = options;
      let { timeoutMessage } = options;

      if (!timeoutMessage) {
        const description = getDescription(target);
        timeoutMessage = `waitFor timed out waiting for selector "${description}"`;
      }

      let callback: () => Element | Element[] | void | null;
      if (count !== null) {
        callback = () => {
          const elements = Array.from(getElements(target, this.element));
          if (elements.length === count) {
            return elements;
          }
          return;
        };
      } else {
        callback = () => getElement(target, this.element);
      }
      return waitUntil(callback, { timeout, timeoutMessage });
    },
  });
}
