## Usage
#### Mocking from Within a Test

```ts
import { GET } from '@warp-drive/holodeck/mock';

await GET(context, 'users/1', () => ({
  data: {
    id: '1',
    type: 'user',
    attributes: {
      name: 'Chris Thoburn',
    },
  },

// set RECORD to false or remove
// the options hash entirely once the request
// has been recorded
}), { RECORD: true });
```
