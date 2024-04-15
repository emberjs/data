import { saveRecord } from '@ember-data/legacy-compat/builders';
const post = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
const savedPostWithGeneric = store.request<Post>(saveRecord(post)).content;
const savedPostNoGeneric = store.request(saveRecord(post)).content;
