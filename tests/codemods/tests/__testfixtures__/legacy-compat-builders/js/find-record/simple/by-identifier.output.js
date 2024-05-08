import { findRecord } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request(findRecord({ type: 'post', id: '1' }));
