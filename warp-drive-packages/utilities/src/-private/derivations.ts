import type { ReactiveResource } from '@warp-drive/core/reactive';
import { Type } from '@warp-drive/core/types/symbols';

interface ConcatDerivation {
  (
    record: ReactiveResource & { [key: string]: unknown },
    options: Record<string, unknown> | null,
    _prop: string
  ): string;
  [Type]: 'concat';
}

/**
 * A derivation for use by {@link ReactiveResource} that joins the given fields
 * with the optional separator (or '' if no separator is provided).
 *
 * Generally you should not need to import and use this function directly.
 *
 * @example
 * {
 *   name: 'fullName',
 *   kind: 'derived',
 *   type: 'concat',
 *   options: {
 *     fields: ['firstName', 'lastName'],
 *     separator: ' ',
 *   },
 * }
 */
export const concat: ConcatDerivation = (
  record: ReactiveResource & { [key: string]: unknown },
  options: Record<string, unknown> | null,
  _prop: string
) => {
  if (!options) {
    throw new Error(`options is required`);
  }
  // SAFETY: we cast internally to a more specific type, for our own use
  // SAFETY: but provide the more general signature to the schema service
  const opts = options as { fields: string[]; separator?: string };
  return opts.fields.map((field) => record[field]).join(opts.separator ?? '');
};
concat[Type] = 'concat';
