import { findAll } from '@ember/test-helpers';
import { findAll as legacyFindAll } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request(legacyFindAll('post'));
