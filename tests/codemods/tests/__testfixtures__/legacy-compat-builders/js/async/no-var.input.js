async function foo() {
  await store.findAll('post');
  return await store.findAll('post');
}
