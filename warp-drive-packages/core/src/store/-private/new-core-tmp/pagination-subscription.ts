import type { RequestManager, Store, StoreRequestInput } from '../../../index';
import type { Future } from '../../../request';
import type { StructuredErrorDocument } from '../../../types/request';
import type { PaginationState, RequestSubscription } from '../../-private';
import { createRequestSubscription, getPaginationState, memoized } from '../../-private';
import { DISPOSE, SubscriptionArgs } from './request-subscription.ts';

interface ErrorFeatures {
  isHidden: boolean;
  isOnline: boolean;
  retry: () => Promise<void>;
}

type ContentFeatures<RT> = {
  // Initial Request
  isOnline: boolean;
  isHidden: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  abort?: () => void;
  latestRequest?: Future<RT>;

  // Pagination
  loadNext?: () => Promise<void>;
  loadPrev?: () => Promise<void>;
  loadPage?: (url: string) => Promise<void>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface PaginationSubscription<RT, E> {
  /**
   * The method to call when the component this subscription is attached to
   * unmounts.
   */
  [DISPOSE](): void;
}

/**
 * A reactive class
 *
 * @hideconstructor
 */
export class PaginationSubscription<RT, E> {
  /** @internal */
  declare private isDestroyed: boolean;
  /** @internal */
  declare private _subscribedTo: object | null;
  /** @internal */
  declare private _args: SubscriptionArgs<RT, E>;
  /** @internal */
  declare store: Store | RequestManager;

  constructor(store: Store | RequestManager, args: SubscriptionArgs<RT, E>) {
    this._args = args;
    this.store = store;
    this.isDestroyed = false;
    this[DISPOSE] = _DISPOSE;
  }

  @memoized
  get isIdle(): boolean {
    return this._requestSubscription.isIdle;
  }

  /**
   * Retry the request, reloading it from the server.
   */
  retry = async (): Promise<void> => {
    await this._requestSubscription.retry();
  };

  /**
   * Refresh the request, updating it in the background.
   */
  refresh = async (): Promise<void> => {
    await this._requestSubscription.refresh();
  };

  /**
   * Loads the prev page based on links.
   */
  loadPrev = async (): Promise<void> => {
    const { prev } = this.paginationState;
    if (prev) {
      await this.loadPage(prev);
    }
  };

  /**
   * Loads the next page based on links.
   */
  loadNext = async (): Promise<void> => {
    const { next } = this.paginationState;
    if (next) {
      await this.loadPage(next);
    }
  };

  /**
   * Loads a specific page by its URL.
   */
  loadPage = async (url: string): Promise<void> => {
    const page = this.paginationState.getPageState(url);
    this.paginationState.activatePage(page);
    if (!page.request) {
      const request = this.store.request({ method: 'GET', url });
      await page.load(request);
    }
  };

  /**
   * Error features to yield to the error slot of a component
   */
  @memoized
  get errorFeatures(): ErrorFeatures {
    return {
      isHidden: this._requestSubscription.isHidden,
      isOnline: this._requestSubscription.isOnline,
      retry: this._requestSubscription.retry,
    };
  }

  /**
   * Content features to yield to the content slot of a component
   */
  @memoized
  get contentFeatures(): ContentFeatures<RT> {
    const contentFeatures = this._requestSubscription.contentFeatures;
    const feat: ContentFeatures<RT> = {
      ...contentFeatures,
      loadPrev: this.loadPrev,
      loadNext: this.loadNext,
      loadPage: this.loadPage,
    };

    if (feat.isRefreshing) {
      feat.abort = () => {
        contentFeatures.latestRequest?.abort();
      };
    }

    return feat;
  }

  /**
   * @internal
   */
  @memoized
  get _requestSubscription(): RequestSubscription<RT, E> {
    return createRequestSubscription<RT, E>(this.store, this._args);
  }

  @memoized
  get request(): Future<RT> {
    return this._requestSubscription.request;
  }

  @memoized
  get paginationState(): PaginationState<RT, StructuredErrorDocument<E>> {
    return getPaginationState<RT, E>(this.request);
  }
}

export function createPaginationSubscription<RT, E>(
  store: Store | RequestManager,
  args: SubscriptionArgs<RT, E>
): PaginationSubscription<RT, E> {
  return new PaginationSubscription(store, args);
}

interface PrivatePaginationSubscription {
  isDestroyed: boolean;
  _requestSubscription: RequestSubscription<unknown, unknown>;
}

function upgradeSubscription(sub: unknown): PrivatePaginationSubscription {
  return sub as PrivatePaginationSubscription;
}

function _DISPOSE<RT, E>(this: PaginationSubscription<RT, E>) {
  const self = upgradeSubscription(this);
  self.isDestroyed = true;
  self._requestSubscription?.[DISPOSE]?.();
}
