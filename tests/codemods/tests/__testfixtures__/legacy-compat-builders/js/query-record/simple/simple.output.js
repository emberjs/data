import { queryRecord } from '@ember-data/legacy-compat/builders';
const post = store.request(queryRecord('post', { id: '1' })).content;
