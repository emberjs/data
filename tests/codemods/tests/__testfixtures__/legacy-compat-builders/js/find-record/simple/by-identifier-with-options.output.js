import { findRecord } from '@ember-data/legacy-compat/builders';
const post = store.request(
  findRecord(
    { type: 'post', id: '1' },
    {
      reload: true,
      backgroundReload: false,
      include: 'author,comments',
      adapterOptions: {},
    }
  )
);
