import { ContextOwner } from './context';
import { type DeferredFuture, type Future, type GodContext, type Handler, type RequestInfo, type StructuredDataDocument } from './types';
export declare function curryFuture<T>(owner: ContextOwner, inbound: Future<T>, outbound: DeferredFuture<T>): Future<T>;
export type HttpErrorProps = {
    code: number;
    name: string;
    status: number;
    statusText: string;
    isRequestError: boolean;
};
export declare function enhanceReason(reason?: string): DOMException;
export declare function handleOutcome<T>(owner: ContextOwner, inbound: Promise<T | StructuredDataDocument<T>>, outbound: DeferredFuture<T>): Future<T>;
export declare function executeNextHandler<T>(wares: Readonly<Handler[]>, request: RequestInfo, i: number, god: GodContext): Future<T>;
//# sourceMappingURL=utils.d.ts.map