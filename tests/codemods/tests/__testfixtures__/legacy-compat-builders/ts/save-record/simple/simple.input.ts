const post = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
const savedPostWithGeneric = await store.saveRecord<Post>(post);
const savedPostNoGeneric = await store.saveRecord(post);
