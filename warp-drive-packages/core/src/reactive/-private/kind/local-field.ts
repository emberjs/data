import { consumeInternalSignal, getOrCreateInternalSignal, notifyInternalSignal } from '../../../store/-private';
import type { LocalField } from '../../../types/schema/fields';
import type { KindContext } from '../default-mode';

export function getLocalField(context: KindContext<LocalField>): unknown {
  const { field } = context;
  const signal = getOrCreateInternalSignal(
    context.signals,
    context.record,
    field.name,
    field.options?.defaultValue ?? null
  );
  consumeInternalSignal(signal);
  return signal.value;
}

export function setLocalField(context: KindContext<LocalField>): boolean {
  const { value } = context;
  const signal = getOrCreateInternalSignal(context.signals, context.record, context.field.name, value);
  if (signal.value !== value) {
    signal.value = value;
    notifyInternalSignal(signal);
  }
  return true;
}
