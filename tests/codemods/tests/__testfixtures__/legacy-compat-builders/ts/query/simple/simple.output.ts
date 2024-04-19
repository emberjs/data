import { query } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request<Post[]>(query<Post>('post', { id: '1' }));
