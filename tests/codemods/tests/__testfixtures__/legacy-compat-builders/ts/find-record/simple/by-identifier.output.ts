import { findRecord } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request<Post>(findRecord<Post>({ type: 'post', id: '1' }));
