import { findAll } from '@ember-data/legacy-compat/builders';
const post = store.request(findAll('post')).content;
