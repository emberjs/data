import { findRecord } from '@ember-data/legacy-compat/builders';
const post = store.request<Post>(findRecord<Post>('post', '1')).content;
