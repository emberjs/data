const post = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
const savedPostWithGeneric = store.saveRecord<Post>(post);
const savedPostNoGeneric = store.saveRecord(post);
