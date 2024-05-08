const post = store.createRecord('post', { name: 'Krystan rules, you drool' });
const savedPost = await store.saveRecord(post);
