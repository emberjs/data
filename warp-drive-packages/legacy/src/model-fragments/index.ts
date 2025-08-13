import type {
  WithArrayLike,
  WithEmberObject,
} from '@warp-drive/legacy/compat/extensions';

import type { Fragment } from './extensions/fragment';
import type { FragmentArray } from './extensions/fragment-array';

export type WithFragment<T> = T & WithEmberObject<T> & Fragment;
export type WithFragmentArray<T extends Fragment> = T &
  WithArrayLike<T> &
  FragmentArray<T>;
