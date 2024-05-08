import { findAll } from '@ember-data/legacy-compat/builders';
async function foo() {
  await store.request(findAll('post'));
  return (await store.request(findAll('post'))).content;
}
