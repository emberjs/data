import { expectTypeOf } from 'expect-type';

import Debug from '@ember-data/debug';
import Store from '@ember-data/store';

expectTypeOf<typeof Debug>().not.toBeAny();
expectTypeOf<typeof Store>().not.toBeAny();
