import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';

import { AuthorSchema } from '../schemas/author';
import { BookSchema } from '../schemas/book';
import { GenreSchema } from '../schemas/genre';

export default useRecommendedStore({
  cache: JSONAPICache,
  schemas: [AuthorSchema, BookSchema, GenreSchema],
});
