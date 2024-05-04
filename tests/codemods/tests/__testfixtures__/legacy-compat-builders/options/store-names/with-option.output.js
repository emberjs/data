import { findAll } from '@ember-data/legacy-compat/builders';
const { content: post } = await db.request(findAll('post'));
