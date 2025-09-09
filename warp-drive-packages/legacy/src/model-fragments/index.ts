import type { WithArrayLike, WithEmberObject } from '../compat/extensions.ts';
import type { Fragment } from './extensions/fragment.ts';
import type { FragmentArray } from './extensions/fragment-array.ts';

export type WithFragment<T> = T & WithEmberObject<T> & Fragment;
export type WithFragmentArray<T extends Fragment> = T & WithArrayLike<T> & FragmentArray<T>;
