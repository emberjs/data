/**
 * These tests are more fro the out-of-monorepo tests,
 * as we'll sever the references links to the source of each of these packages
 *
 * Just need to make sure each module has types at publish.
 */
import { expectTypeOf } from 'expect-type';

import Debug from '@ember-data/debug';
import Store from '@ember-data/store';
import { graphFor } from '@ember-data/graph/-private';
import RequestManager from '@ember-data/request';
import { BuildURLMixin } from '@ember-data/adapter';
import jsonapi from '@ember-data/json-api';
import { adapterFor } from '@ember-data/legacy-compat';
import Model from '@ember-data/model';
import { setBuildURLConfig } from '@ember-data/request-utils';
import Serializer from '@ember-data/serializer';
import { Type } from '@warp-drive/core-types/symbols';

expectTypeOf<typeof Type>().not.toBeAny();
expectTypeOf<typeof Type>().toMatchTypeOf<string>();

// Most of this is to assure thet above imports don't get optimized away
expectTypeOf<typeof import('ember-data')>().not.toBeAny();
expectTypeOf<typeof import('ember-data').default>().toHaveProperty('reopen');
expectTypeOf<typeof Debug>().not.toBeAny();
expectTypeOf<typeof Store>().not.toBeAny();
expectTypeOf<typeof graphFor>().not.toBeAny();
expectTypeOf<typeof Model>().not.toBeAny();
expectTypeOf<typeof Serializer>().not.toBeAny();
expectTypeOf<typeof RequestManager>().not.toBeAny();
expectTypeOf<typeof BuildURLMixin>().not.toBeAny();
expectTypeOf<typeof jsonapi>().not.toBeAny();
expectTypeOf<typeof setBuildURLConfig>().not.toBeAny();
expectTypeOf<typeof adapterFor>().not.toBeAny();
