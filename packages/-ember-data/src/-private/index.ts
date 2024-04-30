// public
import ArrayProxy from '@ember/array/proxy';
import { deprecate } from '@ember/debug';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ObjectProxy from '@ember/object/proxy';

deprecate('Importing from `ember-data/-private` is deprecated without replacement.', false, {
  id: 'ember-data:deprecate-legacy-imports',
  for: 'ember-data',
  until: '6.0',
  since: {
    enabled: '5.2',
    available: '5.2',
  },
});

export { default as Store } from '../store';

export { DS } from './core';
export { Errors } from '@ember-data/model/-private';
export { Snapshot } from '@ember-data/legacy-compat/-private';

export { RecordArrayManager, coerceId } from '@ember-data/store/-private';
export { ManyArray, PromiseManyArray } from '@ember-data/model/-private';
export { SnapshotRecordArray } from '@ember-data/legacy-compat/-private';

export const PromiseArray = ArrayProxy.extend(PromiseProxyMixin);
export const PromiseObject = ObjectProxy.extend(PromiseProxyMixin);
