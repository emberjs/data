import {
  consumeInternalSignal,
  getOrCreateInternalSignal,
  notifyInternalSignal,
  type Store,
  withSignalStore,
} from '../../../store/-private';
import type { StableRecordIdentifier } from '../../../types';
import type { LocalField } from '../../../types/schema/fields';
import type { ModeInfo, PathLike } from '../default-mode';

export function getLocalField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LocalField,
  path: PathLike,
  mode: ModeInfo
): unknown {
  const signals = withSignalStore(record);
  const prop = Array.isArray(path) ? path.at(-1)! : path;
  const signal = getOrCreateInternalSignal(signals, record, prop, field.options?.defaultValue ?? null);
  consumeInternalSignal(signal);
  return signal.value;
}

export function setLocalField(
  store: Store,
  record: object,
  resourceKey: StableRecordIdentifier,
  field: LocalField,
  path: PathLike,
  mode: ModeInfo,
  value: unknown
): boolean {
  const signals = withSignalStore(record);
  const prop = Array.isArray(path) ? path.at(-1)! : path;
  const signal = getOrCreateInternalSignal(signals, record, prop, field.options?.defaultValue ?? null);
  if (signal.value !== value) {
    signal.value = value;
    notifyInternalSignal(signal);
  }
  return true;
}
