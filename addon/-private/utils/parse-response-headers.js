import HeadersPolyfill from './headers'
import isEnabled from 'ember-data/-private/features';
import EmptyObject from "ember-data/-private/system/empty-object";
import { deprecate } from 'ember-data/-private/debug';

const CLRF = '\u000d\u000a';

function deprecateProperty(object, deprecatedKey) {
  function _deprecate() {
    deprecate(
      `Usage of \`headers['${deprecatedKey}']\` is deprecated, use \`headers.get('${deprecatedKey}')\` instead.`,
      false,
      {
        id: 'ds.headers.property-access',
        until: '3.0.0'
      }
    );
  }

  Object.defineProperty(object, deprecatedKey, {
    configurable: true,
    enumerable: false,
    get() {
      _deprecate();
      return this.get(deprecatedKey);
    }
  });
}

export default function parseResponseHeaders(headersString) {
  var headers;
  if (isEnabled('ds-headers-api')) {
    headers = new HeadersPolyfill();
  } else {
    headers = new EmptyObject();
  }

  if (!headersString) {
    return headers;
  }

  let headerPairs = headersString.split(CLRF);

  headerPairs.forEach((header) => {
    let [field, ...value] = header.split(':');

    field = field.trim();
    value = value.join(':').trim();

    if (value) {
      if (isEnabled('ds-headers-api')) {
        headers.append(field, value);
        deprecateProperty(headers, field);
      } else {
        headers[field] = value;
      }
    }
  });

  return headers;
}
