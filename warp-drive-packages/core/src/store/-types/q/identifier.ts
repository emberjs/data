import type { CacheKeyType, RequestKey, ResourceKey } from '../../../types/identifier.ts';
import type { ImmutableRequestInfo } from '../../../types/request.ts';

export interface GenerationMethod {
  (data: ImmutableRequestInfo, bucket: 'document'): string | null;
  (data: unknown | { type: string }, bucket: 'record'): string;
  (data: unknown, bucket: CacheKeyType): string | null;
}

export type UpdateMethod = {
  (identifier: ResourceKey, newData: unknown, bucket: 'record'): void;
  (identifier: RequestKey, newData: unknown, bucket: 'document'): void;
  (identifier: { lid: string }, newData: unknown, bucket: never): void;
};

export type ForgetMethod = (identifier: RequestKey | ResourceKey, bucket: CacheKeyType) => void;

export type ResetMethod = () => void;

export type KeyInfo = {
  id: string | null;
  type: string;
};
export type KeyInfoMethod = (resource: unknown, known: ResourceKey | null) => KeyInfo;
