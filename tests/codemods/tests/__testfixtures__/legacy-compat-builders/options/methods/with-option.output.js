import { findRecord } from '@ember-data/legacy-compat/builders';
await store.request(findRecord('user', '1'));
await store.findAll('user');
