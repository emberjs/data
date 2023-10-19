import { assert } from '@ember/debug';

const RBRACKET = /\[\]$/;

interface PlainObject {
  [key: string]: string | PlainObject | PlainObject[] | string[];
}
type ParamObject = { name: string; value: string };

function isPlainObject<T>(obj: unknown): obj is T {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

function isPrimitiveArray(obj: unknown): obj is Array<PlainObject | string> {
  return Array.isArray(obj);
}

function isParamsArray(obj: unknown): obj is ParamObject[] {
  return Array.isArray(obj);
}

function buildParams<T extends PlainObject>(
  prefix: string,
  obj: ParamObject | ParamObject[] | Array<T | string> | T | string,
  s: string[]
) {
  let i: number, len: number, key: keyof T & string;

  if (prefix) {
    if (isPrimitiveArray(obj)) {
      for (i = 0, len = obj.length; i < len; i++) {
        if (RBRACKET.test(prefix)) {
          add(s, prefix, obj[i] as string);
        } else {
          buildParams(prefix + '[' + (typeof obj[i] === 'object' && obj[i] !== null ? i : '') + ']', obj[i], s);
        }
      }
    } else if (isPlainObject<T>(obj)) {
      for (key in obj) {
        buildParams(prefix + '[' + key + ']', obj[key], s);
      }
    } else {
      assert(`query params cannot be a { name, value } pair if prefix is present`, typeof obj !== 'object');
      add(s, prefix, obj);
    }
  } else if (isParamsArray(obj)) {
    for (i = 0, len = obj.length; i < len; i++) {
      add(s, obj[i].name, obj[i].value);
    }
  } else {
    assert(`query params cannot be a string if no prefix is present`, typeof obj !== 'string');
    assert(`query params should not be an array if no prefix is present`, !Array.isArray(obj));
    assert(`query params should not be a { name, value } pair if no prefix is present`, isPlainObject<T>(obj));
    for (key in obj) {
      buildParams(key, obj[key], s);
    }
  }
  return s;
}

/*
 * Helper function that turns the data/body of a request into a query param string.
 * This is directly copied from jQuery.param.
 */
export function serializeQueryParams(queryParamsObject: PlainObject | string): string {
  return buildParams('', queryParamsObject, []).join('&');
}

/*
 * Part of the `serializeQueryParams` helper function.
 */
function add(s: string[], k: string, v?: string | (() => string)) {
  // Strip out keys with undefined value and replace null values with
  // empty strings (mimics jQuery.ajax)
  if (v === undefined) {
    return;
  } else if (v === null) {
    v = '';
  }

  v = typeof v === 'function' ? v() : v;
  s[s.length] = `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
}
