import { query } from '@ember-data/legacy-compat/builders';
const post = store.request<Post[]>(query<Post>('post', { id: '1' })).content;
