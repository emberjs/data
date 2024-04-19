import { findAll } from '@ember-data/legacy-compat/builders';
(await store.request(findAll('post'))).content;
