const response = {
  meta: {
    schemas: {
      // a flattened user for instance
      'schema-matrix-table-risk-by-control': [
        {
          name: 'risk',
          kind: 'belongsTo',
          type: 'risk',
        },
        {
          name: 'controlsDatum',
          kind: 'belongsTo',
          type: 'control-datum',
        },
        {
          name: 'uid',
          kind: 'attribute',
          type: 'string',
        },
      ],
    },
  },
  data: {
    id: 'schema-page',
    type: '1234123-2341234-21341234',
    relationships: {
      rows: {
        data: [
          {
            type: 'schema-asdf12314',
            id: '1234123',
          },
        ],
      },
    },
  },
  included: [
    {
      id: 'schema-asdf12314',
      type: '1234123',
      attributes: {
        cells: [
          {
            value: 'asdf',
            label: 'First Name',
            type: 'email',
            options: {
              href: '/users/1',
            },
            key: 'firstName',
            src: {
              type: 'user',
              id: '1',
              field: 'firstName',
            },
          },
        ],
      },
    },
  ],
};
