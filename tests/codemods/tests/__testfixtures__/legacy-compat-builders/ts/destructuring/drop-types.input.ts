const post: Post = await this.store.findAll<Post>('post');
const { id }: Post = await this.store.findAll<Post>('post');
