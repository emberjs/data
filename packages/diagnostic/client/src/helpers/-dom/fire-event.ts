import type { HelperContext } from './-helper-context.ts';
import { isDocument, isElement } from './-target.ts';
import { withHooks } from './helper-hooks.ts';

const MOUSE_EVENT_CONSTRUCTOR = (() => {
  try {
    new MouseEvent('test');
    return true;
  } catch {
    return false;
  }
})();
const DEFAULT_EVENT_OPTIONS = { bubbles: true, cancelable: true };

export const KEYBOARD_EVENT_TYPES = ['keydown', 'keypress', 'keyup'] as const;
export type KeyboardEventType = (typeof KEYBOARD_EVENT_TYPES)[number];

export function isKeyboardEventType(eventType: unknown): eventType is KeyboardEventType {
  return KEYBOARD_EVENT_TYPES.includes(eventType as KeyboardEventType);
}

const MOUSE_EVENT_TYPES = [
  'click',
  'mousedown',
  'mouseup',
  'dblclick',
  'mouseenter',
  'mouseleave',
  'mousemove',
  'mouseout',
  'mouseover',
] as const;
export type MouseEventType = (typeof MOUSE_EVENT_TYPES)[number];

export function isMouseEventType(eventType: unknown): eventType is MouseEventType {
  return MOUSE_EVENT_TYPES.includes(eventType as MouseEventType);
}

const FILE_SELECTION_EVENT_TYPES = ['change'] as const;
export type FileSelectionEventType = (typeof FILE_SELECTION_EVENT_TYPES)[number];

export function isFileSelectionEventType(eventType: unknown): eventType is FileSelectionEventType {
  return FILE_SELECTION_EVENT_TYPES.includes(eventType as FileSelectionEventType);
}

export function isFileSelectionInput(element: unknown): element is HTMLInputElement {
  return !!(element as HTMLInputElement).files;
}

export function fireEvent(
  scope: HelperContext,
  element: Element | Document | Window,
  eventType: KeyboardEventType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
): Promise<Event>;
export function fireEvent(
  scope: HelperContext,
  element: Element | Document | Window,
  eventType: MouseEventType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
): Promise<Event | void>;

export function fireEvent(
  scope: HelperContext,
  element: Element | Document | Window,
  eventType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: any
): Promise<Event>;
/**
  Internal helper used to build and dispatch events throughout the other DOM helpers.

  @private
  @param {Element} element the element to dispatch the event to
  @param {string} eventType the type of event
  @param {Object} [options] additional properties to be set on the event
  @returns {Event} the event that was dispatched
*/
export function fireEvent(
  scope: HelperContext,
  element: Element | Document | Window,
  eventType: string,
  options = {}
): Promise<Event | void> {
  return withHooks({
    scope,
    name: `fireEvent:${eventType}`,
    render: false,
    args: [element],
    cb: () => {
      if (!element) {
        throw new Error('Must pass an element to `fireEvent`');
      }

      let event;
      if (isKeyboardEventType(eventType)) {
        event = _buildKeyboardEvent(eventType, options);
      } else if (isMouseEventType(eventType)) {
        let rect;
        if (element instanceof Window && element.document.documentElement) {
          rect = element.document.documentElement.getBoundingClientRect();
        } else if (isDocument(element)) {
          rect = element.documentElement.getBoundingClientRect();
        } else if (isElement(element)) {
          rect = element.getBoundingClientRect();
        } else {
          return;
        }

        const x = rect.left + 1;
        const y = rect.top + 1;
        const simulatedCoordinates = {
          screenX: x + 5, // Those numbers don't really mean anything.
          screenY: y + 95, // They're just to make the screenX/Y be different of clientX/Y..
          clientX: x,
          clientY: y,
          ...options,
        };

        event = buildMouseEvent(eventType, simulatedCoordinates);
      } else if (isFileSelectionEventType(eventType) && isFileSelectionInput(element)) {
        event = buildFileEvent(eventType, element, options);
      } else {
        event = buildBasicEvent(eventType, options);
      }

      element.dispatchEvent(event);
      return event;
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildBasicEvent(type: string, options: any = {}): Event {
  const event = document.createEvent('Events');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const bubbles = options.bubbles !== undefined ? options.bubbles : true;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const cancelable = options.cancelable !== undefined ? options.cancelable : true;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  delete options.bubbles;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  delete options.cancelable;

  // bubbles and cancelable are readonly, so they can be
  // set when initializing event
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  event.initEvent(type, bubbles, cancelable);
  for (const prop in options) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (event as any)[prop] = options[prop];
  }
  return event;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMouseEvent(type: MouseEventType, options: any = {}) {
  let event;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const eventOpts: any = { view: window, ...DEFAULT_EVENT_OPTIONS, ...options };
  if (MOUSE_EVENT_CONSTRUCTOR) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    event = new MouseEvent(type, eventOpts);
  } else {
    try {
      event = document.createEvent('MouseEvents');
      event.initMouseEvent(
        type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.bubbles,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.cancelable,
        window,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.detail,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.screenX,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.screenY,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.clientX,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.clientY,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.ctrlKey,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.altKey,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.shiftKey,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.metaKey,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.button,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        eventOpts.relatedTarget
      );
    } catch {
      event = buildBasicEvent(type, options);
    }
  }

  return event;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function _buildKeyboardEvent(type: KeyboardEventType, options: any = {}): Event {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const eventOpts: any = { ...DEFAULT_EVENT_OPTIONS, ...options };
  let event: Event | undefined;
  let eventMethodName: 'initKeyboardEvent' | 'initKeyEvent' | undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    event = new KeyboardEvent(type, eventOpts);

    // Property definitions are required for B/C for keyboard event usage
    // If this properties are not defined, when listening for key events
    // keyCode/which will be 0. Also, keyCode and which now are string
    // and if app compare it with === with integer key definitions,
    // there will be a fail.
    //
    // https://w3c.github.io/uievents/#interface-keyboardevent
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
    Object.defineProperty(event, 'keyCode', {
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return parseInt(eventOpts.keyCode);
      },
    });

    Object.defineProperty(event, 'which', {
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return parseInt(eventOpts.which);
      },
    });

    return event;
  } catch {
    // left intentionally blank
  }

  try {
    event = document.createEvent('KeyboardEvents');
    eventMethodName = 'initKeyboardEvent';
  } catch {
    // left intentionally blank
  }

  if (!event) {
    try {
      event = document.createEvent('KeyEvents');
      eventMethodName = 'initKeyEvent';
    } catch {
      // left intentionally blank
    }
  }

  if (event && eventMethodName) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    (event as any)[eventMethodName](
      type,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      eventOpts.bubbles,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      eventOpts.cancelable,
      window,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      eventOpts.ctrlKey,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      eventOpts.altKey,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      eventOpts.shiftKey,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      eventOpts.metaKey,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      eventOpts.keyCode,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      eventOpts.charCode
    );
  } else {
    event = buildBasicEvent(type, options);
  }

  return event;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFileEvent(type: FileSelectionEventType, element: HTMLInputElement, options: any = {}): Event {
  const event = buildBasicEvent(type);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const files = options.files;

  if (Array.isArray(options)) {
    throw new Error(
      'Please pass an object with a files array to `triggerEvent` instead of passing the `options` param as an array to.'
    );
  }

  if (Array.isArray(files)) {
    Object.defineProperty(files, 'item', {
      value(index: number) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return typeof index === 'number' ? this[index] : null;
      },
      configurable: true,
    });
    Object.defineProperty(element, 'files', {
      value: files,
      configurable: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const elementProto = Object.getPrototypeOf(element);
    const valueProp = Object.getOwnPropertyDescriptor(elementProto, 'value');
    Object.defineProperty(element, 'value', {
      configurable: true,
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return valueProp!.get!.call(element);
      },
      set(value) {
        valueProp!.set!.call(element, value);

        // We are sure that the value is empty here.
        // For a non-empty value the original setter must raise an exception.
        Object.defineProperty(element, 'files', {
          configurable: true,
          value: [],
        });
      },
    });
  }

  Object.defineProperty(event, 'target', {
    value: element,
  });

  return event;
}
