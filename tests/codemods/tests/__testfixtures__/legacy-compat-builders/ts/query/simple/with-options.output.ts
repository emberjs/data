import { query } from '@ember-data/legacy-compat/builders';
const post = store.request<Post[]>(
  query<Post>(
    'post',
    { id: '1' },
    {
      reload: true,
      backgroundReload: false,
      include: 'author,comments',
      adapterOptions: {},
    }
  )
).content;
