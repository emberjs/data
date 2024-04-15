const post = store.createRecord('post', { name: 'Krystan rules, you drool' });
const { content: savedPost } = store.saveRecord(post, { adapterOptions: {} });
