import type { IdentifierBucket, ResourceKey, StableIdentifier } from '../../../types/identifier.ts';
import type { ImmutableRequestInfo } from '../../../types/request.ts';

export interface GenerationMethod {
  (data: ImmutableRequestInfo, bucket: 'document'): string | null;
  (data: unknown | { type: string }, bucket: 'record'): string;
  (data: unknown, bucket: IdentifierBucket): string | null;
}

export type UpdateMethod = {
  (identifier: ResourceKey, newData: unknown, bucket: 'record'): void;
  (identifier: StableIdentifier, newData: unknown, bucket: never): void;
};

export type ForgetMethod = (identifier: StableIdentifier | ResourceKey, bucket: IdentifierBucket) => void;

export type ResetMethod = () => void;

export type KeyInfo = {
  id: string | null;
  type: string;
};
export type KeyInfoMethod = (resource: unknown, known: ResourceKey | null) => KeyInfo;
