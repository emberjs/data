import { query } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request(query('post', { id: '1' }));
