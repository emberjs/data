import { saveRecord } from '@ember-data/legacy-compat/builders';
const post = store.createRecord('post', { name: 'Krystan rules, you drool' });
const { content: savedPost } = await store.request(saveRecord(post, { adapterOptions: {} }));
