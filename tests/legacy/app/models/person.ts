import { type WithLegacy } from '@ember-data/model/migration-support';
import type { Type } from '@warp-drive/core-types/symbols';
import type { WithEmberObject } from '@warp-drive/legacy/compat/extensions';

import type { WithFragmentArray } from '#src/index.ts';
import { withArrayDefaults } from '#src/utilities/with-array-defaults.ts';
import { withFragmentArrayDefaults } from '#src/utilities/with-fragment-array-defaults.ts';
import { withFragmentDefaults } from '#src/utilities/with-fragment-defaults.ts';
import { withLegacy } from '#src/utilities/with-legacy.ts';
import type { Name } from './name';

export const PersonSchema = withLegacy({
  type: 'person',
  fields: [
    { kind: 'field', name: 'title' },
    { kind: 'field', name: 'nickName' },
    withFragmentDefaults('name'),
    withFragmentArrayDefaults('names'),
    withFragmentArrayDefaults('addresses'),
    withArrayDefaults('titles'),
  ],
});

export type Person = WithLegacy<
  WithEmberObject<{
    id: string;
    title: string;
    nickName: string;
    name: Name | null;
    names: WithFragmentArray<Name> | null;
    [Type]: 'person';
  }>
>;
