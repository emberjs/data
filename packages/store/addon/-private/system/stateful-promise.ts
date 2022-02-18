import { tracked } from '@glimmer/tracking';

import { resolve } from 'rsvp';

export class StatefulPromise {
  declare promise: Promise<unknown> | null;
  declare isDestroyed: boolean;
  declare isDestroying: boolean;

  @tracked isPending: boolean = false;

  @tracked isRejected: boolean = false;

  @tracked isResolved: boolean = false;

  constructor(promise: Promise<unknown>) {
    this.promise = tapPromise(this, promise);
  }

  then(success: (value: unknown) => unknown, failure: (reason: unknown) => PromiseLike<never>) {
    return this.promise!.then(success, failure);
  }

  catch(cb: (reason: unknown) => PromiseLike<never>) {
    return this.promise!.catch(cb);
  }

  finally(cb: () => void) {
    return this.promise!.finally(cb);
  }
}

function tapPromise(klass: StatefulPromise, promise: Promise<unknown>) {
  klass.isPending = true;
  klass.isResolved = false;
  klass.isRejected = false;
  return resolve(promise).then(
    (content: unknown) => {
      klass.isPending = false;
      klass.isResolved = true;
      return content;
    },
    (error: Error | unknown) => {
      klass.isPending = false;
      klass.isResolved = false;
      klass.isRejected = true;
      throw error;
    }
  );
}
