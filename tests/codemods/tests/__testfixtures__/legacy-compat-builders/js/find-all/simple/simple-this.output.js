import { findAll } from '@ember-data/legacy-compat/builders';
const { content: post } = await this.store.request(findAll('post'));
