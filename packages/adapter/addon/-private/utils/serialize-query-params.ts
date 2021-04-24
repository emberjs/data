const RBRACKET = /\[\]$/;

function isPlainObject(obj: any): boolean {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

/*
 * Helper function that turns the data/body of a request into a query param string.
 * This is directly copied from jQuery.param.
 */
export function serializeQueryParams(queryParamsObject: object | string): string {
  let s: any[] = [];
  function buildParams(prefix: string, obj: any) {
    let i, len, key;

    if (prefix) {
      if (Array.isArray(obj)) {
        for (i = 0, len = obj.length; i < len; i++) {
          if (RBRACKET.test(prefix)) {
            add(s, prefix, obj[i]);
          } else {
            buildParams(prefix + '[' + (typeof obj[i] === 'object' ? i : '') + ']', obj[i]);
          }
        }
      } else if (isPlainObject(obj)) {
        for (key in obj) {
          buildParams(prefix + '[' + key + ']', obj[key]);
        }
      } else {
        add(s, prefix, obj);
      }
    } else if (Array.isArray(obj)) {
      for (i = 0, len = obj.length; i < len; i++) {
        add(s, obj[i].name, obj[i].value);
      }
    } else {
      for (key in obj) {
        buildParams(key, obj[key]);
      }
    }
    return s;
  }

  return buildParams('', queryParamsObject).join('&').replace(/%20/g, '+');
}

/*
 * Part of the `serializeQueryParams` helper function.
 */
function add(s: Array<any>, k: string, v?: string | (() => string)) {
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
