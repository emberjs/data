import { makeArray } from '@ember/array';
import { isPresent } from '@ember/utils';

/**
  @module @ember-data/store
*/

const SOURCE_POINTER_REGEXP = /^\/?data\/(attributes|relationships)\/(.*)/;
const SOURCE_POINTER_PRIMARY_REGEXP = /^\/?data/;
const PRIMARY_ATTRIBUTE_KEY = 'base';

/**
  Convert an hash of errors into an array with errors in JSON-API format.
   ```javascript
  import DS from 'ember-data';
   const { errorsHashToArray } = DS;
   let errors = {
    base: 'Invalid attributes on saving this record',
    name: 'Must be present',
    age: ['Must be present', 'Must be a number']
  };
   let errorsArray = errorsHashToArray(errors);
  // [
  //   {
  //     title: "Invalid Document",
  //     detail: "Invalid attributes on saving this record",
  //     source: { pointer: "/data" }
  //   },
  //   {
  //     title: "Invalid Attribute",
  //     detail: "Must be present",
  //     source: { pointer: "/data/attributes/name" }
  //   },
  //   {
  //     title: "Invalid Attribute",
  //     detail: "Must be present",
  //     source: { pointer: "/data/attributes/age" }
  //   },
  //   {
  //     title: "Invalid Attribute",
  //     detail: "Must be a number",
  //     source: { pointer: "/data/attributes/age" }
  //   }
  // ]
  ```
  @method errorsHashToArray
  @public
  @param {Object} errors hash with errors as properties
  @return {Array} array of errors in JSON-API format
*/
export function errorsHashToArray(errors) {
  let out = [];

  if (isPresent(errors)) {
    Object.keys(errors).forEach(key => {
      let messages = makeArray(errors[key]);
      for (let i = 0; i < messages.length; i++) {
        let title = 'Invalid Attribute';
        let pointer = `/data/attributes/${key}`;
        if (key === PRIMARY_ATTRIBUTE_KEY) {
          title = 'Invalid Document';
          pointer = `/data`;
        }
        out.push({
          title: title,
          detail: messages[i],
          source: {
            pointer: pointer,
          },
        });
      }
    });
  }

  return out;
}

/**
  Convert an array of errors in JSON-API format into an object.

  ```javascript
  import DS from 'ember-data';

  const { errorsArrayToHash } = DS;

  let errorsArray = [
    {
      title: 'Invalid Attribute',
      detail: 'Must be present',
      source: { pointer: '/data/attributes/name' }
    },
    {
      title: 'Invalid Attribute',
      detail: 'Must be present',
      source: { pointer: '/data/attributes/age' }
    },
    {
      title: 'Invalid Attribute',
      detail: 'Must be a number',
      source: { pointer: '/data/attributes/age' }
    }
  ];

  let errors = errorsArrayToHash(errorsArray);
  // {
  //   "name": ["Must be present"],
  //   "age":  ["Must be present", "must be a number"]
  // }
  ```

  @method errorsArrayToHash
  @public
  @param {Array} errors array of errors in JSON-API format
  @return {Object}
*/
export function errorsArrayToHash(errors) {
  let out = {};

  if (isPresent(errors)) {
    errors.forEach(error => {
      if (error.source && error.source.pointer) {
        let key = error.source.pointer.match(SOURCE_POINTER_REGEXP);

        if (key) {
          key = key[2];
        } else if (error.source.pointer.search(SOURCE_POINTER_PRIMARY_REGEXP) !== -1) {
          key = PRIMARY_ATTRIBUTE_KEY;
        }

        if (key) {
          out[key] = out[key] || [];
          out[key].push(error.detail || error.title);
        }
      }
    });
  }

  return out;
}
