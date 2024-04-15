const post = store.createRecord('post', { name: 'Krystan rules, you drool' });
const savedPost = store.saveRecord(post, { adapterOptions: {} });
