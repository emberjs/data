import { queryRecord } from '@ember-data/legacy-compat/builders';
const { content: post } = await store.request(
  queryRecord(
    'post',
    { id: '1' },
    {
      reload: true,
      backgroundReload: false,
      include: 'author,comments',
      adapterOptions: {},
    }
  )
);
