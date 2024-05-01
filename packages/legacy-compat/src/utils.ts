/**
  Utilities for helping to migrate to stricter
  and more consistent use of IDs and types.

  @module @ember-data/legacy-compat/utils
  @main @ember-data/legacy-compat/utils
  @deprecated
*/
import { dasherize } from '@ember/string';

import { dependencySatisfies, importSync, macroCondition } from '@embroider/macros';

import { DEBUG } from '@warp-drive/build-config/env';

interface AssertFunc {
  (desc: string, condition: unknown): asserts condition;
  (desc: string): never;
}

type Reporter = (type: 'formatted-id' | 'formatted-type', actual: unknown, expected: unknown) => void;
type Normalizer = (type: string) => string;
let singularize: (str: string) => string;
if (macroCondition(dependencySatisfies('ember-inflector', '*'))) {
  singularize = (importSync('ember-inflector') as typeof import('ember-inflector')).singularize;
}

let MismatchReporter: Reporter = function () {};

// TODO: @runspired This pattern prevents AssertFn from being removed in production builds
// but we should enable that if we can.
let _AssertFn: (message: string, condition: unknown) => void = function () {};
const AssertFn: AssertFunc = ((message: string, condition: unknown) => {
  if (!condition) {
    _AssertFn(message, condition);
  }
  if (DEBUG) {
    if (!condition) {
      throw new Error(`Assertion Failed: ${message}`);
    }
  }
}) as unknown as AssertFunc;
let NormalizedType: Normalizer = (str: string) => {
  return singularize(dasherize(str));
};

/**
 * Configure a function to be called when an id or type
 * changes during normalization. This is useful for instrumenting
 * to discover places where usage in the app is not consistent.
 *
 * @method configureMismatchReporter
 * @for @ember-data/legacy-compat/utils
 * @param method a function which takes a mismatch-type ('formatted-id' | 'formatted-type'), actual, and expected value
 * @public
 * @static
 */
export function configureMismatchReporter(fn: Reporter): void {
  MismatchReporter = fn;
}

/**
 * Configure a function to be called when an id or type
 * fails validation. This is useful for instrumenting
 * to discover places where usage in the app is not consistent.
 *
 * @method configureAssertFn
 * @for @ember-data/legacy-compat/utils
 * @param method a function which takes a message and a condition
 * @public
 * @static
 */
export function configureAssertFn(fn: (message: string, condition: unknown) => void): void {
  _AssertFn = fn;
}

/**
 * Configure a function to be called to normalize
 * a resource type string. Used by both formattedType
 * and isEquivType to ensure consistent normalization
 * during comparison.
 *
 * If validation fails or the type turns out be unnormalized
 * the configured mismatch reporter and assert functions will
 * be called.
 *
 * @method configureTypeNormalization
 * @for @ember-data/legacy-compat/utils
 * @param method a function which takes a string and returns a string
 * @public
 * @static
 */
export function configureTypeNormalization(fn: (type: string) => string): void {
  NormalizedType = fn;
}

const NORMALIZED_TYPES = new Map<string, string>();

/**
 * Converts a potentially unnormalized type into the format expected
 * by our EmberData Cache. Currently this is singular-dasherized.
 *
 * you should not rely on this function to give you an exact format
 * for display purposes. Formatting for display should be handled
 * differently if the exact format matters.
 *
 * Asserts invalid types (undefined, null, '') in dev.
 *
 * **Usage**
 *
 * ```js
 * import formattedType from 'soxhub-client/helpers/formatted-type';
 *
 * formattedType('post'); // => 'post'
 * formattedType('posts'); // => 'post'
 * formattedType('Posts'); // => 'post'
 * formattedType('post-comment'); // => 'post-comment'
 * formattedType('post-comments'); // => 'post-comment'
 * formattedType('post_comment'); // => 'post-comment'
 * formattedType('postComment'); // => 'post-comment'
 * formattedType('PostComment'); // => 'post-comment'
 * ```
 *
 * @method formattedType
 * @for @ember-data/legacy-compat/utils
 * @param {string} type the potentially un-normalized type
 * @return {string} the normalized type
 * @public
 * @static
 */
export function formattedType<T extends string>(type: T | string): T {
  AssertFn('formattedType: type must not be null', type !== null);
  AssertFn('formattedType: type must not be undefined', type !== undefined);
  AssertFn('formattedType: type must be a string', typeof type === 'string');
  AssertFn('formattedType: type must not be empty', type.length > 0);
  let normalized = NORMALIZED_TYPES.get(type);

  if (normalized === undefined) {
    normalized = NormalizedType(type);
    NORMALIZED_TYPES.set(type, normalized);
  }

  if (normalized !== type) {
    MismatchReporter('formatted-type', type, normalized);
  }

  return normalized as T;
}

/**
 * Format an id to the format expected by the EmberData Cache.
 * Currently this means that id should be `string | null`.
 *
 * Asserts invalid IDs (undefined, '', 0, '0') in dev.
 *
 * **Usage**
 *
 * ```js
 * import formattedId from 'client/utils/formatted-id';
 *
 * formattedId('1'); // => '1'
 * formattedId(1); // => '1'
 * formattedId(null); // => null
 *	```
 *
 * @method formattedId
 * @for @ember-data/legacy-compat/utils
 * @param {string | number | null} id the potentially un-normalized id
 * @return {string | null} the normalized id
 * @public
 * @static
 */
export function formattedId(id: string | number): string;
export function formattedId(id: null): null;
export function formattedId(id: string | number | null): string | null;
export function formattedId(id: string | number | null): string | null {
  AssertFn('formattedId: id must not be undefined', id !== undefined);
  AssertFn(
    'formattedId: id must be a number, string or null',
    typeof id === 'number' || typeof id === 'string' || id === null
  );
  AssertFn(
    'formattedId: id must not be empty',
    typeof id === 'number' || id === null || (typeof id === 'string' && id.length > 0)
  );
  AssertFn('formattedId: id must not be 0', id !== '0' && id !== 0);

  const formatted = id === null ? null : String(id);
  if (formatted !== id) {
    MismatchReporter('formatted-id', id, formatted);
  }
  return id === null ? null : String(id);
}

/**
 * Compares two types for strict equality, converting them to
 * the format expected by the EmberData Cache to ensure
 * differences in format are accounted for in the comparison.
 *
 * Asserts when expected or actual are invalid types in dev.
 * Expected may never be null.
 *
 * ```js
 * isEquivType('posts', 'post'); // true
 * isEquivType('post', 'post'); // true
 * isEquivType('posts', 'posts'); // true
 * isEquivType('post-comment', 'postComment'); // true
 * isEquivType('post-comment', 'PostComment'); // true
 * isEquivType('post-comment', 'post_comment'); // true
 * isEquivType('post-comment', 'post-comment'); // true
 * isEquivType('post-comment', 'post'); // false
 * isEquivType('posts', null); // false
 * ```
 *
 * @method isEquivType
 * @for @ember-data/legacy-compat/utils
 * @param {string} expected a potentially unnormalized type to match against
 * @param {string} actual a potentially unnormalized type to match against
 * @return {boolean} true if the types are equivalent
 * @public
 * @static
 */
export function isEquivType(expected: string, actual: string): boolean {
  AssertFn('isEquivType: Expected type must not be null', expected !== null);
  AssertFn('isEquivType: Expected type must not be undefined', expected !== undefined);
  AssertFn('isEquivType: Expected type must be a string', typeof expected === 'string');
  AssertFn('isEquivType: Expected type must not be empty', expected.length > 0);

  AssertFn('isEquivType: Actual type must not be null', actual !== null);
  AssertFn('isEquivType: Actual type must not be undefined', actual !== undefined);
  AssertFn('isEquivType: Actual type must be a string', typeof actual === 'string');
  AssertFn('isEquivType: Actual type must not be empty', actual.length > 0);

  return expected === actual || formattedType(expected) === formattedType(actual);
}

/**
 * Compares two IDs for strict equality, converting them to
 * the format expected by the EmberData Cache to ensure
 * differences in format are accounted for in the comparison.
 *
 * Asserts when expected or actual are invalid IDs in dev.
 * Expected may never be null.
 *
 * ```js
 * isEquivId('1', 1); // true
 * isEquivId('2', '2'); // true
 * isEquivId(3, '3'); // true
 * isEquivId(4, '3'); // false
 * isEquivId(1, null); // false
 * ```
 *
 * @method isEquivId
 * @for @ember-data/legacy-compat/utils
 * @param {string | number} expected a potentially un-normalized id to match against
 * @param {string | number} actual a potentially un-normalized id to match against
 * @return {boolean} true if the ids are equivalent
 * @public
 * @static
 */
export function isEquivId(expected: string | number, actual: string | number | null): boolean {
  AssertFn('isEquivId: Expected id must not be null', expected !== null);
  AssertFn('isEquivId: Expected id must not be undefined', expected !== undefined);
  AssertFn(
    'isEquivId: Expected id must be a number or string',
    typeof expected === 'number' || typeof expected === 'string'
  );
  AssertFn(
    'isEquivId: Expected id must not be empty',
    typeof expected === 'number' || (typeof expected === 'string' && expected.length > 0)
  );
  AssertFn('isEquivId: Expected id must not be 0', expected !== '0' && expected !== 0);

  AssertFn('isEquivId: Actual id must not be undefined', actual !== undefined);
  AssertFn(
    'isEquivId: Actual id must be a number, string or null',
    typeof actual === 'number' || typeof actual === 'string' || actual === null
  );
  AssertFn(
    'isEquivId: Actual id must not be empty',
    actual === null || typeof actual === 'number' || (typeof actual === 'string' && actual.length > 0)
  );
  AssertFn('isEquivId: Actual id must not be 0', actual !== '0' && actual !== 0);

  return expected === actual || formattedId(expected) === formattedId(actual);
}
