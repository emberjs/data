import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import type { ImmutableRequestInfo } from '../../types/request';
import { cloneResponseProperties, type Context } from './context';
import type { FetchError } from './utils';

export type { FetchError };

interface FastbootRequest extends Request {
  protocol: string;
  host: string;
}
export interface FastBoot {
  require(moduleName: string): unknown;
  isFastBoot: boolean;
  request: FastbootRequest;
}

// Lazily close over fetch to avoid breaking Mirage
const _fetch: typeof fetch =
  typeof fetch !== 'undefined'
    ? (...args) => fetch(...args)
    : typeof FastBoot !== 'undefined'
      ? (...args) => ((FastBoot as FastBoot).require('node-fetch') as typeof fetch)(...args)
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
          window.fetch.toString().replace(/\s+/g, '') !== 'function fetch() { [native code] }'.replace(/\s+/g, ''))
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

type ContentType = 'json' | 'text' | 'xml' | 'html' | 'xml2json' | (string & {});
interface Parser {
  /**
   * Eventaully we want to support streaming,
   * at which point this will be allowed to be true
   * to indicate that the parser can handle streaming
   */
  stream: false;
  parse: (chunk: string, isFull: boolean) => unknown;
}

interface FetchConfig {
  parserType(request: Context['request'], response: Response): ContentType;
  parsers: {
    [key in ContentType]?: Parser;
  };
}

const DEFAULT_TEXT_PARSER = {
  stream: false,
  parse: (chunk: string) => {
    return chunk as unknown;
  },
} satisfies Parser;

const DEFAULT_JSON_PARSER = {
  stream: false,
  parse: (chunk: string) => {
    return JSON.parse(chunk) as unknown;
  },
} satisfies Parser;

const DEFAULT_DOM_PARSER = new DOMParser();
const DEFAULT_HTML_PARSER = {
  stream: false,
  parse: (chunk: string) => {
    return DEFAULT_DOM_PARSER.parseFromString(chunk, 'text/html') as unknown;
  },
} satisfies Parser;

const DEFAULT_XML_PARSER = {
  stream: false,
  parse: (chunk: string) => {
    return DEFAULT_DOM_PARSER.parseFromString(chunk, 'text/xml') as unknown;
  },
} satisfies Parser;

const DEFAULT_PARSERS = {
  json: DEFAULT_JSON_PARSER,
  html: DEFAULT_HTML_PARSER,
  xml: DEFAULT_XML_PARSER,
  text: DEFAULT_TEXT_PARSER,
} as FetchConfig['parsers'];

const PARSER = 'parser';
const PARSER_TYPE = 'parserType';

/**
 * ```ts
 * import { Fetch } from '@warp-drive/core';
 * ```
 *
 * A basic Fetch Handler which converts a request into a
 * `fetch` call presuming the response to be `json`.
 *
 * ```ts
 * import { RequestManager, Fetch } from '@warp-drive/core';
 *
 * const manager = new RequestManager()
 *   .use([Fetch]);
 * ```
 *
 * @public
 */
class Fetch {
  declare config: FetchConfig;

  constructor(config: FetchConfig) {
    this.config = config;
  }

  request<T>(context: Context): Promise<T> {
    return makeFetchRequest<T>(context, this.config);
  }

  static request<T>(context: Context): Promise<T> {
    return makeFetchRequest<T>(context, null);
  }
}

function getParser(req: ImmutableRequestInfo, response: Response, config: FetchConfig | null): Parser | null {
  const maybeParser = req.options?.[PARSER];

  if (maybeParser) {
    return maybeParser as Parser;
  }

  const parserType = (req.options?.[PARSER_TYPE] as ContentType) ?? config?.parserType(req, response);
  if (parserType) {
    const parser = config?.parsers[parserType];
    if (parser) {
      return parser;
    }
    if (DEFAULT_PARSERS[parserType]) {
      return DEFAULT_PARSERS[parserType];
    }
    assert(`The parser for ${parserType} is not defined in the config`);
  }
  return null;
}

function attemptBestParser(request: ImmutableRequestInfo, response: Response): Parser {
  const accepts = request.headers?.get('Accept');
  const contentType = response.headers.get('Content-Type');
  const intuitedType = contentType ?? accepts;

  if (intuitedType) {
    const type = intuitedType.split(';')[0].trim();
    if (type.includes('json')) {
      return DEFAULT_JSON_PARSER;
    }
    if (type.includes('text/html')) {
      return DEFAULT_HTML_PARSER;
    }
    if (type.includes('xml') || type.includes('svg') || type.includes('xhtml')) {
      return DEFAULT_XML_PARSER;
    }
    if (type.includes('text/')) {
      return DEFAULT_TEXT_PARSER;
    }
  }

  return DEFAULT_JSON_PARSER;
}

async function makeFetchRequest<T>(context: Context, options: FetchConfig | null): Promise<T> {
  let response: Response;

  try {
    assert(
      'The Fetch handler expects the request to have a URL, none was provided.',
      context.request.url && typeof context.request.url === 'string'
    );
    response = await _fetch(context.request.url, context.request);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      (e as FetchError).statusText = 'Aborted';
      (e as FetchError).status = 20;
      (e as FetchError).isRequestError = true;
    } else {
      (e as FetchError).statusText = 'Unknown Network Error';
      (e as FetchError).status = 0;
      if (!(e instanceof DOMException)) {
        (e as FetchError).code = 0;
      }
      (e as FetchError).isRequestError = true;
    }
    throw e;
  }

  const parser = getParser(context.request, response, options) ?? attemptBestParser(context.request, response);
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
    } & FetchError;
    error.status = response.status;
    error.statusText = statusText;
    error.isRequestError = true;
    error.code = error.status;
    error.name = error.statusText.replaceAll(' ', '') + 'Error';
    error.content = errorPayload;
    throw error;
  } else {
    if (!parser.stream) {
      return parser.parse(text, true) as T;
    }
    return text as T;
  }
}

function isDict(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object';
}

export { Fetch };
