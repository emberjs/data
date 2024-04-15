import { findRecord } from '@ember-data/legacy-compat/builders';
const post = store.request<Post>(findRecord<Post>({ type: 'post', id: '1' })).content;
