import { saveRecord } from '@ember-data/legacy-compat/builders';
const post = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
const { content: savedPostWithGeneric } = await store.request<Post>(saveRecord(post));
const { content: savedPostNoGeneric } = await store.request(saveRecord(post));
