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

import { DEBUG } from '@warp-drive/build-config/env';

import { cloneResponseProperties, type Context } from './-private/context';
import type { HttpErrorProps } from './-private/utils';

// Lazily close over fetch to avoid breaking Mirage
const _fetch: typeof fetch =
  typeof fetch !== 'undefined'
    ? (...args) => fetch(...args)
    : typeof FastBoot !== 'undefined'
      ? (...args) => (FastBoot.require('node-fetch') as typeof fetch)(...args)
      : ((() => {
          throw new Error('No Fetch Implementation Found');
        }) as typeof fetch);

// clones a response in a way that should still
// allow it to stream
function cloneResponse(response: Response, overrides: Partial<Response>) {
  const props = cloneResponseProperties(response);
  return new Response(response.body, Object.assign(props, overrides));
}

let IS_MAYBE_MIRAGE = () => false;
if (DEBUG) {
  IS_MAYBE_MIRAGE = () =>
    Boolean(
      typeof window !== 'undefined' &&
        ((window as { server?: { pretender: unknown } }).server?.pretender ||
          (window.fetch.toString() !== 'function fetch() { [native code] }' &&
            window.fetch.toString() !== 'function fetch() {\n    [native code]\n}'))
    );
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
  async request<T>(context: Context): Promise<T> {
    let response: Response;

    try {
      response = await _fetch(context.request.url!, context.request);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        (e as unknown as HttpErrorProps).statusText = 'Aborted';
        (e as unknown as HttpErrorProps).status = 20;
        (e as unknown as HttpErrorProps).isRequestError = true;
      } else {
        (e as HttpErrorProps).statusText = 'Unknown Network Error';
        (e as HttpErrorProps).status = 0;
        (e as HttpErrorProps).isRequestError = true;
      }
      throw e;
    }

    const isError = !response.ok || response.status >= 400;
    const op = context.request.op;
    const isMutationOp = Boolean(op && MUTATION_OPS.has(op));

    if (!isError && !isMutationOp && response.status !== 204 && !response.headers.has('date')) {
      if (IS_MAYBE_MIRAGE()) {
        response.headers.set('date', new Date().toUTCString());
      } else {
        const headers = new Headers(response.headers);
        headers.set('date', new Date().toUTCString());
        response = cloneResponse(response, {
          headers,
        });
      }
    }

    context.setResponse(response);

    if (response.status === 204) {
      return null as T;
    }

    let text = '';
    // if we are in a mirage context, we cannot support streaming
    if (IS_MAYBE_MIRAGE()) {
      text = await response.text();
    } else {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let isStreaming = context.hasRequestedStream;
      let stream: TransformStream | null = isStreaming ? new TransformStream() : null;
      let writer = stream?.writable.getWriter();

      if (isStreaming) {
        // Listen for the abort event on the AbortSignal
        context.request.signal?.addEventListener('abort', () => {
          if (!isStreaming) {
            return;
          }
          void stream!.writable.abort('Request Aborted');
          void stream!.readable.cancel('Request Aborted');
        });
        context.setStream(stream!.readable);
      }

      // eslint-disable-next-line no-constant-condition
      while (true) {
        // we manually read the stream instead of using `response.json()`
        // or `response.text()` because if we need to stream the body
        // we need to be able to pass the stream along efficiently.
        const { done, value } = await reader.read();
        if (done) {
          if (isStreaming) {
            isStreaming = false;
            await writer!.ready;
            await writer!.close();
          }
          break;
        }
        text += decoder.decode(value, { stream: true });

        // if we are streaming, we want to pass the stream along
        if (isStreaming) {
          await writer!.ready;
          await writer!.write(value);
        } else if (context.hasRequestedStream) {
          const encode = new TextEncoder();
          isStreaming = true;
          stream = new TransformStream();
          // Listen for the abort event on the AbortSignal
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          context.request.signal?.addEventListener('abort', () => {
            if (!isStreaming) {
              return;
            }
            void stream!.writable.abort('Request Aborted');
            void stream!.readable.cancel('Request Aborted');
          });
          context.setStream(stream.readable);
          writer = stream.writable.getWriter();
          await writer.ready;
          await writer.write(encode.encode(text));
          await writer.ready;
          await writer.write(value);
        }
      }

      if (isStreaming) {
        isStreaming = false;
        await writer!.ready;
        await writer!.close();
      }
    }
    // if we are an error, we will want to throw
    if (isError) {
      let errorPayload: object | undefined;
      try {
        errorPayload = JSON.parse(text) as object;
      } catch {
        // void;
      }
      // attempt errors discovery
      const errors = Array.isArray(errorPayload)
        ? errorPayload
        : isDict(errorPayload) && Array.isArray(errorPayload.errors)
          ? errorPayload.errors
          : null;

      const statusText = response.statusText || ERROR_STATUS_CODE_FOR.get(response.status) || 'Unknown Request Error';
      const msg = `[${response.status} ${statusText}] ${context.request.method ?? 'GET'} (${response.type}) - ${
        response.url
      }`;

      const error = (errors ? new AggregateError(errors, msg) : new Error(msg)) as Error & {
        content: object | undefined;
      } & HttpErrorProps;
      error.status = response.status;
      error.statusText = statusText;
      error.isRequestError = true;
      error.code = error.status;
      error.name = error.statusText.replaceAll(' ', '') + 'Error';
      error.content = errorPayload;
      throw error;
    } else {
      return JSON.parse(text) as T;
    }
  },
};

function isDict(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

export default Fetch;
