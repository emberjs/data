import { json } from '@sveltejs/kit';

const USERS = {
  '1': {
    id: '1',
    type: 'user',
    attributes: {
      first_name: 'John',
      last_name: 'Doe',
    },
  },
  '2': {
    id: '2',
    type: 'user',
    attributes: {
      first_name: 'Jane',
      last_name: 'Smith',
    },
  },
};

export function GET({ params }) {
  return json({
    data: USERS[params.user_id as keyof typeof USERS],
  });
}
