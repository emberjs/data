class MyOutdatedComponent {
  *myOldEmberConcurrencyTask() {
    yield this.store.findAll('post');
    const post = yield this.store.findAll('post');
    return yield this.store.findAll('post');
  }
}
