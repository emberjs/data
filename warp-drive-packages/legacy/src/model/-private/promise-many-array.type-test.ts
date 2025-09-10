/* eslint-disable @typescript-eslint/no-unused-vars */
import { expectTypeOf } from 'expect-type';

import type { LegacyManyArray } from '@warp-drive/core/reactive';
import { getPromiseState } from '@warp-drive/core/reactive';
import type { Type } from '@warp-drive/core/types/symbols';

import type { PromiseManyArray } from './promise-many-array';

interface Pet {
  [Type]: 'pet';
  name: string;
}

interface User {
  [Type]: 'user';
  name: string;
  pets: PromiseManyArray<Pet>;
}

const user = { name: 'Chris', pets: [] } as unknown as User;
const pets = user.pets;

type ResolvedPets = Awaited<typeof pets>;
expectTypeOf<ResolvedPets>().toMatchTypeOf<LegacyManyArray<Pet>>();

const state = getPromiseState(pets);

type ValuePets = typeof state.value;
expectTypeOf<ValuePets>().toMatchTypeOf<LegacyManyArray<Pet> | null>();
