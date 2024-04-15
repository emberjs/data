const post = store.createRecord<Post>('post', { name: 'Krystan rules, you drool' });
const savedPostWithGeneric = store.saveRecord<Post>(post, { adapterOptions: {} });
const savedPostNoGeneric = store.saveRecord(post, { adapterOptions: {} });
