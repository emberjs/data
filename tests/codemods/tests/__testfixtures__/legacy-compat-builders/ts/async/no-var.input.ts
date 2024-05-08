async function foo() {
  await store.findAll<Post>('post');
  return await store.findAll<Post>('post');
}
