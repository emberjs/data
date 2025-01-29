/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * These tests are more fro the out-of-monorepo tests,
 * as we'll sever the references links to the source of each of these packages
 *
 * Just need to make sure each module has types at publish.
 */
import { expectTypeOf } from 'expect-type';
import StoreX from 'ember-data/store';
import DS from 'ember-data';

// @ts-expect-error this exists in the real package, but not DT Types
import Adapter from '@ember-data/adapter/-private/build-url-mixin';

expectTypeOf<typeof StoreX>().not.toBeAny();

import Store from '@ember-data/store';
// @ts-expect-error this exists in the real package, but not DT Types
import RequestManager from '@ember-data/request';
import { BuildURLMixin } from '@ember-data/adapter';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import jsonapi from '@ember-data/json-api';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { adapterFor } from '@ember-data/legacy-compat';
import Model from '@ember-data/model';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { setBuildURLConfig } from '@ember-data/request-utils';
import Serializer from '@ember-data/serializer';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { createCache } from '@ember-data/tracking';

// Most of this is to assure thet above imports don't get optimized away
expectTypeOf<typeof DS>().not.toBeAny();
expectTypeOf<typeof import('ember-data')>().not.toBeAny();
expectTypeOf<typeof Store>().not.toBeAny();
expectTypeOf<typeof Model>().not.toBeAny();
expectTypeOf<typeof Model>().toHaveProperty('reopen');
expectTypeOf<typeof Serializer>().not.toBeAny();
// @ts-expect-error no DT Types
expectTypeOf<typeof RequestManager>().not.toBeAny();
expectTypeOf<typeof BuildURLMixin>().not.toBeAny();
// @ts-expect-error no DT Types
expectTypeOf<typeof jsonapi>().not.toBeAny();
// @ts-expect-error no DT Types
expectTypeOf<typeof createCache>().not.toBeAny();
// @ts-expect-error no DT Types
expectTypeOf<typeof setBuildURLConfig>().not.toBeAny();
// @ts-expect-error no DT Types
expectTypeOf<typeof adapterFor>().not.toBeAny();
