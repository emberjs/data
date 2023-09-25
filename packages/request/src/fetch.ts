/**
 * A basic Fetch Handler which converts a request into a
 * `fetch` call presuming the response to be `json`.
 *
 * ```ts
 * import Fetch from '@ember-data/request/fetch';
 *
 * manager.use([Fetch]);
 * ```
 *
 * @module @ember-data/request/fetch
 * @main @ember-data/request/fetch
 */
import type { HttpErrorProps } from '-private/utils';
import { cloneResponseProperties, type Context } from './-private/context';

const _fetch: typeof fetch =
  typeof fetch !== 'undefined'
    ? fetch
    // @ts-expect-error FastBoot is untyped
    : typeof FastBoot !== 'undefined'
    // @ts-expect-error FastBoot is untyped
    ? (FastBoot.require('node-fetch') as typeof fetch)
    : ((() => {
        throw new Error('No Fetch Implementation Found');
      }) as typeof fetch);

// clones a response in a way that should still
// allow it to stream
function cloneResponse(response: Response, overrides: Partial<Response>) {
  const props = cloneResponseProperties(response);
  return new Response(response.body, Object.assign(props, overrides));
}

const MUTATION_OPS = new Set(['updateRecord', 'createRecord', 'deleteRecord']);
const ERROR_STATUS_CODE_FOR = new Map([
  [400, 'Bad Request'],
  [401, 'Unauthorized'],
  [402, 'Payment Required'],
  [403, 'Forbidden'],
  [404, 'Not Found'],
  [405, 'Method Not Allowed'],
  [406, 'Not Acceptable'],
  [407, 'Proxy Authentication Required'],
  [408, 'Request Timeout'],
  [409, 'Conflict'],
  [410, 'Gone'],
  [411, 'Length Required'],
  [412, 'Precondition Failed'],
  [413, 'Payload Too Large'],
  [414, 'URI Too Long'],
  [415, 'Unsupported Media Type'],
  [416, 'Range Not Satisfiable'],
  [417, 'Expectation Failed'],
  [419, 'Page Expired'],
  [420, 'Enhance Your Calm'],
  [421, 'Misdirected Request'],
  [422, 'Unprocessable Entity'],
  [423, 'Locked'],
  [424, 'Failed Dependency'],
  [425, 'Too Early'],
  [426, 'Upgrade Required'],
  [428, 'Precondition Required'],
  [429, 'Too Many Requests'],
  [430, 'Request Header Fields Too Large'],
  [431, 'Request Header Fields Too Large'],
  [450, 'Blocked By Windows Parental Controls'],
  [451, 'Unavailable For Legal Reasons'],
  [500, 'Internal Server Error'],
  [501, 'Not Implemented'],
  [502, 'Bad Gateway'],
  [503, 'Service Unavailable'],
  [504, 'Gateway Timeout'],
  [505, 'HTTP Version Not Supported'],
  [506, 'Variant Also Negotiates'],
  [507, 'Insufficient Storage'],
  [508, 'Loop Detected'],
  [509, 'Bandwidth Limit Exceeded'],
  [510, 'Not Extended'],
  [511, 'Network Authentication Required'],
]);

/**
 * A basic handler which converts a request into a
 * `fetch` call presuming the response to be `json`.
 *
 * ```ts
 * import Fetch from '@ember-data/request/fetch';
 *
 * manager.use([Fetch]);
 * ```
 *
 * @class Fetch
 * @public
 */
const Fetch = {
  async request(context: Context) {
    let response;

    try {
      response = await _fetch(context.request.url!, context.request);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        (e as unknown as HttpErrorProps).statusText = 'Aborted';
        (e as unknown as HttpErrorProps).status = 20;
        (e as unknown as HttpErrorProps).isRequestError = true;
      } else {
        (e as unknown as HttpErrorProps).statusText = 'Unknown Network Error';
        (e as unknown as HttpErrorProps).status = 0;
        (e as unknown as HttpErrorProps).isRequestError = true;
      }
      throw e;
    }

    const isError = !response.ok || response.status >= 400;
    const op = context.request.op;
    const isMutationOp = Boolean(op && MUTATION_OPS.has(op));

    if (!isError && !isMutationOp && response.status !== 204 && !response.headers.has('date')) {
      const headers = new Headers(response.headers);
      headers.set('date', new Date().toUTCString());
      response = cloneResponse(response, { headers });
    }

    context.setResponse(response);

    // if we are an error, we will want to throw
    if (isError) {
      const text = await response.text();
      let errorPayload: object | undefined;
      try {
        errorPayload = JSON.parse(text) as object;
      } catch {
        // void;
      }
      // attempt errors discovery
      const errors = Array.isArray(errorPayload) ? errorPayload : isDict(errorPayload) ? (Array.isArray(errorPayload.errors) ? errorPayload.errors : Array.isArray(errorPayload.data) ? errorPayload.data : null) : null;
      const msg = `[${response.status}] ${response.statusText ? response.statusText + ' ' : ''}- ${response.url}`;

      const error = (errors ? new AggregateError(errors, msg) : new Error(msg)) as Error & { content: object | undefined } & HttpErrorProps;
      error.status = response.status;
      error.statusText = response.statusText || ERROR_STATUS_CODE_FOR.get(response.status) || 'Unknown Request Error';
      error.isRequestError = true;
      error.code = error.status;
      error.name = error.statusText.replaceAll(' ', '') + 'Error';
      error.content = errorPayload;
      throw error;
    } else {
      return response.status === 204 ? null : response.json();
    }
  },
};

function isDict(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

export default Fetch;
