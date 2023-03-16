import type { Context } from '@ember-data/request/-private/context';
import type { NextFn } from '@ember-data/request/-private/types';

export const LegacyNetworkHandler = {
  request<T>(context: Context, next: NextFn<T>) {
    return next(context.request);
  },
};
