import { query } from '@ember-data/legacy-compat/builders';
const post = store.request(
  query(
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
