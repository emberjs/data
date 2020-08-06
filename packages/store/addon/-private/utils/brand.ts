import { symbol } from './symbol';

/**
  @module @ember-data/store
*/

/**
 * Use this brand to assign a string key to an interface
 * for mapping the interface to a tightly coupled internal
 * class implementation.
 *
 * This allows us to expose the interface publicly but
 * seamlessly upgrade these interfaces for our own use
 * internally when internal methods and properties are
 * needed.
 *
 * @internal
 */

export const BRAND_SYMBOL: unique symbol = symbol('DEBUG-ts-brand');
