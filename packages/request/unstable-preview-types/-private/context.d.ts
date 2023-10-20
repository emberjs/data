import type { Deferred, GodContext, ImmutableRequestInfo, RequestInfo, ResponseInfo } from './types';
export declare function cloneResponseProperties(response: Response): ResponseInfo;
export declare class ContextOwner {
    hasSetStream: boolean;
    hasSetResponse: boolean;
    hasSubscribers: boolean;
    stream: Deferred<ReadableStream | null>;
    response: ResponseInfo | null;
    request: ImmutableRequestInfo;
    enhancedRequest: ImmutableRequestInfo;
    nextCalled: number;
    god: GodContext;
    controller: AbortController;
    requestId: number;
    constructor(request: RequestInfo, god: GodContext);
    getResponse(): ResponseInfo | null;
    getStream(): Promise<ReadableStream | null>;
    abort(reason: DOMException): void;
    setStream(stream: ReadableStream | Promise<ReadableStream | null> | null): void;
    resolveStream(): void;
    setResponse(response: ResponseInfo | Response | null): void;
}
export declare class Context {
    #private;
    request: ImmutableRequestInfo;
    id: number;
    constructor(owner: ContextOwner);
    setStream(stream: ReadableStream | Promise<ReadableStream | null>): void;
    setResponse(response: ResponseInfo | Response | null): void;
}
export type HandlerRequestContext = Context;
//# sourceMappingURL=context.d.ts.map