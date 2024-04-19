import { findAll } from '@ember-data/legacy-compat/builders';
(await store.request<Post[]>(findAll<Post>('post'))).content;
