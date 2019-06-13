import memberDefined from '../utils/member-defined';
import validateResource from '../validate-resource';

import { IValidationContext } from 'ember-data';

/**
 * TODO update the below because resource-identifiers probably can have links
 *  but ember-data doesn't allow resource-identifiers in data/included yet anyway
 *
 * The `data` key of a json-api document must contain either
 *
 * 1) an object representing either
 *    a) a resource-identifier (Reference) with type, id, and optional meta
 *    b) a resource-object (Resource) with type, id and optional meta, links, attributes, and relationships
 * 2) an array consisting of either
 *    c) entirely resource-identifiers
 *    d) entirely resource-objects
 *
 * Because of ambiguity in the json-api spec allowing for resource-object's without attributes and relationships
 * to look suspiciously similar to resource-identifiers we define that a resource-object MUST have AT LEAST ONE
 * of `attributes`, `relationships`, or `links`.
 *
 * Spec - ResourceObject: http://jsonapi.org/format/#document-resource-objects
 * Spec - ResourceIdentifier: http://jsonapi.org/format/#document-resource-identifier-objects
 *
 * This also means that a resource-identifier MUST NOT have links, which is supported by the spec but appears
 * to be violated in many real-world applications.
 *
 * For further reading on how we validate the structure of a resource see the `validateResource` method.
 *
 * @param validator
 * @param document
 * @param errors
 * @param path
 * @returns {boolean}
 */
export default function dataIsValid({ validator, document, issues, path }: IValidationContext) {
  if (!memberDefined(document, 'data')) {
    return true;
  }

  if (document.data === null) {
    return true;
  } else if (Array.isArray(document.data)) {
    let hasError = false;
    document.data.forEach((resource, i) => {
      let didError = validateResource({
        validator,
        document,
        target: resource,
        issues,
        path: `${path}.data[${i}]`
      });

      hasError = hasError || didError;
    });

    return hasError;
  } else {
    return validateResource({
      validator,
      document,
      target: document.data,
      issues,
      path: path + '.data'
    });
  }
}
