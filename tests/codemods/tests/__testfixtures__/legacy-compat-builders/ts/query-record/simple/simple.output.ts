import { queryRecord } from '@ember-data/legacy-compat/builders';
const post = store.request<Post>(queryRecord<Post>('post', { id: '1' })).content;
