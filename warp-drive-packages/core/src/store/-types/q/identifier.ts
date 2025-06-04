import type { IdentifierBucket, StableIdentifier, StableRecordIdentifier } from '../../../types/identifier.ts';
import type { ImmutableRequestInfo } from '../../../types/request.ts';

export interface GenerationMethod {
  (data: ImmutableRequestInfo, bucket: 'document'): string | null;
  (data: unknown | { type: string }, bucket: 'record'): string;
  (data: unknown, bucket: IdentifierBucket): string | null;
}

export type UpdateMethod = {
  (identifier: StableRecordIdentifier, newData: unknown, bucket: 'record'): void;
  (identifier: StableIdentifier, newData: unknown, bucket: never): void;
};

export type ForgetMethod = (identifier: StableIdentifier | StableRecordIdentifier, bucket: IdentifierBucket) => void;

export type ResetMethod = () => void;

export type KeyInfo = {
  id: string | null;
  type: string;
};
export type KeyInfoMethod = (resource: unknown, known: StableRecordIdentifier | null) => KeyInfo;
