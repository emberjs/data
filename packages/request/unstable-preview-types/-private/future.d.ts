import type { ContextOwner } from './context';
import { type Deferred, type DeferredFuture, type Future, type StructuredDocument } from './types';
export declare function isFuture<T>(maybe: unknown): maybe is Future<T>;
export declare function createDeferred<T>(): Deferred<T>;
export declare function upgradePromise<T>(promise: Promise<StructuredDocument<T>>, future: Future<T>): Future<T>;
export declare function createFuture<T>(owner: ContextOwner): DeferredFuture<T>;
//# sourceMappingURL=future.d.ts.map