import type { WithLegacy } from '@ember-data/model/migration-support';
import type { Type } from '@warp-drive/core-types/symbols';
import type { WithEmberObject } from '@warp-drive/legacy/compat/extensions';
import type { WithFragmentArray } from '@warp-drive/legacy/model-fragments';
import {
  withArrayDefaults,
  withFragmentArrayDefaults,
  withFragmentDefaults,
  withLegacy,
} from '@warp-drive/legacy/model-fragments';

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
