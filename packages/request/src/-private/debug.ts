import { isDevelopingApp, macroCondition } from '@embroider/macros';

import { Context } from './context';
import type { RequestInfo } from './types';

const ValidKeys = new Map<string, string | string[]>([
  ['data', 'json'],
  ['options', 'object'],
  ['url', 'string'],
  ['cache', ['default', 'force-cache', 'no-cache', 'no-store', 'only-if-cached', 'reload']],
  ['credentials', ['include', 'omit', 'same-origin']],
  [
    'destination',
    [
      '',
      'object',
      'audio',
      'audioworklet',
      'document',
      'embed',
      'font',
      'frame',
      'iframe',
      'image',
      'manifest',
      'paintworklet',
      'report',
      'script',
      'sharedworker',
      'style',
      'track',
      'video',
      'worker',
      'xslt',
    ],
  ],
  ['headers', 'record'],
  ['integrity', 'string'],
  ['keepalive', 'boolean'],
  ['method', ['GET', 'PUT', 'PATCH', 'DELETE', 'POST', 'OPTIONS']],
  ['mode', ['same-origin', 'cors', 'navigate', 'no-cors']],
  ['redirect', ['error', 'follow', 'manual']],
  ['referrer', 'string'],
  [
    'referrerPolicy',
    [
      '',
      'same-origin',
      'no-referrer',
      'no-referrer-when-downgrade',
      'origin',
      'origin-when-cross-origin',
      'strict-origin',
      'strict-origin-when-cross-origin',
      'unsafe-url',
    ],
  ],
]);

function isMaybeContext(request: unknown) {
  if (request && typeof request === 'object') {
    const keys = Object.keys(request);
    if (keys.length === 1 && keys[0] === 'request') {
      return true;
    }
  }
  return false;
}

function validateKey(key: string, value: unknown, errors: string[]) {
  const schema = ValidKeys.get(key);
  if (!schema && !IgnoredKeys.has(key)) {
    errors.push(`InvalidKey: '${key}'`);
    return;
  }
  if (schema) {
    if (Array.isArray(schema)) {
      if (!schema.includes(value as string)) {
        errors.push(
          `InvalidValue: key ${key} should be a one of '${schema.join("', '")}', received ${
            typeof value === 'string' ? value : '<a value of type ' + typeof value + '>'
          }`
        );
      }
      return;
    } else if (schema === 'json') {
      try {
        JSON.stringify(value);
      } catch (e) {
        errors.push(
          `InvalidValue: key ${key} should be a JSON serializable value, but failed to serialize with Error - ${
            (e as Error).message
          }`
        );
      }
      return;
    } else if (schema === 'record') {
      const _type = typeof value;
      if (!value || _type !== 'object' || Array.isArray(value)) {
        errors.push(
          `InvalidValue: key ${key} should be a dictionary of string keys to string values, received ${
            value ? (Array.isArray(value) ? 'array' : _type) : 'null'
          }`
        );
        return;
      }
      const keys = Object.keys(value);
      keys.forEach((k) => {
        if (typeof k !== 'string') {
          errors.push(`\tThe key ${String(k)} on ${key} should be a string key`);
        } else if (typeof value[k] !== 'string') {
          errors.push(`\tThe value of ${key}.${k} should be a string`);
        }
      });
      return;
    } else if (schema === 'string') {
      if (typeof value !== 'string' || value.length === 0) {
        errors.push(
          `InvalidValue: key ${key} should be a non-empty string, received ${
            typeof value === 'string' ? "''" : typeof value
          }`
        );
      }
      return;
    } else if (schema === 'object') {
      if (!value || Array.isArray(value) || typeof value !== 'object') {
        errors.push(`InvalidValue: key ${key} should be an object`);
      }
      return;
    } else if (schema === 'boolean') {
      if (typeof value !== 'boolean') {
        errors.push(`InvalidValue: key ${key} should be a boolean, received ${typeof value}`);
      }
      return;
    }
  }
}

const IgnoredKeys = new Set(['signal']);

export function assertValidRequest(
  request: RequestInfo | Context,
  isTopLevel: boolean
): asserts request is RequestInfo {
  if (macroCondition(isDevelopingApp())) {
    // handle basic shape
    if (!request) {
      throw new Error(
        `Expected ${
          isTopLevel ? 'RequestManager.request' : 'next'
        }(<request>) to be called with a request, but none was provided.`
      );
    }
    if (Array.isArray(request) || typeof request !== 'object') {
      throw new Error(
        `The \`request\` passed to \`${
          isTopLevel ? 'RequestManager.request' : 'next'
        }(<request>)\` should be an object, received \`${Array.isArray(request) ? 'array' : typeof request}\``
      );
    }
    if (Object.keys(request).length === 0) {
      throw new Error(
        `The \`request\` passed to \`${
          isTopLevel ? 'RequestManager.request' : 'next'
        }(<request>)\` was empty (\`{}\`). Requests need at least one valid key.`
      );
    }

    // handle accidentally passing context entirely
    if (request instanceof Context) {
      throw new Error(
        `Expected a request passed to \`${
          isTopLevel ? 'RequestManager.request' : 'next'
        }(<request>)\` but received the previous handler's context instead`
      );
    }
    // handle Object.assign({}, context);
    if (isMaybeContext(request)) {
      throw new Error(
        `Expected a request passed to \`${
          isTopLevel ? 'RequestManager.request' : 'next'
        }(<request>)\` but received an object with a request key instead.`
      );
    }

    // handle schema
    const keys = Object.keys(request);
    const validationErrors = [];
    keys.forEach((key) => {
      validateKey(key, request[key], validationErrors);
    });
    if (validationErrors.length) {
      const error: Error & { errors: string[] } = new Error(
        `Invalid Request passed to \`${
          isTopLevel ? 'RequestManager.request' : 'next'
        }(<request>)\`.\n\nThe following issues were found:\n\n\t${validationErrors.join('\n\t')}`
      ) as Error & { errors: string[] };
      error.errors = validationErrors;
      throw error;
    }
  }
}
