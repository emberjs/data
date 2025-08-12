/**
 * Used as a helper to setup the relevant parts of a fragment schema
 * and add extensions etc.
 *
 * @param fragmentType The type of the fragment
 * @param fragmentName The optional name of the fragment. If not provided, it will default to the fragmentType.
 * @returns The schema for a fragment
 */
export function withFragmentDefaults<
  FragmentType extends string,
  FragmentName extends string,
>(fragmentType: FragmentType, fragmentName?: FragmentName) {
  return {
    kind: 'schema-object' as const,
    type: `fragment:${fragmentType}` as const,
    name: fragmentName ?? fragmentType,
    options: {
      objectExtensions: ['ember-object', 'fragment'],
    },
  };
}
