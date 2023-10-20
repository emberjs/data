import { Context } from './context';
import type { RequestInfo } from './types';
export declare function deepFreeze<T = unknown>(value: T): T;
export declare function assertValidRequest(request: RequestInfo | Context, isTopLevel: boolean): asserts request is RequestInfo;
//# sourceMappingURL=debug.d.ts.map