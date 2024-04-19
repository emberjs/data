import { findAll } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request(findAll('post'));
