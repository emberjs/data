import { queryRecord } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request(queryRecord('post', { id: '1' }));
