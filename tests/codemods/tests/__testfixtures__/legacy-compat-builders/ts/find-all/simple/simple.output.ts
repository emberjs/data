import { findAll } from '@ember-data/legacy-compat/builders';
const post = store.request<Post[]>(findAll<Post>('post')).content;
