import type { Future } from '@warp-drive/core/request';

/**
 * Utilities to assist in recovering from the error.
 */
export interface RecoveryFeatures {
  isOnline: boolean;
  isHidden: boolean;
  retry: () => Promise<void>;
}

/**
 * Utilities for keeping the request fresh
 */
export interface ContentFeatures<RT> {
  isOnline: boolean;
  isHidden: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  abort?: () => void;
  latestRequest?: Future<RT>;
}

export type AutorefreshBehaviorType = 'online' | 'interval' | 'invalid';
export type AutorefreshBehaviorCombos =
  | boolean
  | AutorefreshBehaviorType
  | `${AutorefreshBehaviorType},${AutorefreshBehaviorType}`
  | `${AutorefreshBehaviorType},${AutorefreshBehaviorType},${AutorefreshBehaviorType}`;
