/*
 * Internal Types
 *
 * These types form the foundation of types we will eventually take public.
 */
import { AdapterRegistry, ModelRegistry, SerializerRegistry, TransformRegistry } from '@ember-data/types/registeries';

interface Registry {}

export interface RegistryMap {
  model: Registry;
  adapter: Registry;
  serializer: Registry;
  transform: Registry;
}

export type DefaultRegistry = {
  model: ModelRegistry;
  serializer: SerializerRegistry;
  adapter: AdapterRegistry;
  transform: TransformRegistry;
};

type ResolvedSerializerRegistry<RegistryMap> = Omit<
  Record<keyof RegistryMap['model'] | keyof RegistryMap['adapter'], RegistryMap['serializer']['application']>,
  keyof RegistryMap['serializer']
> &
  RegistryMap['serializer'];

type ResolvedAdapterRegistry<RegistryMap> = Omit<
  Record<keyof RegistryMap['model'] | keyof RegistryMap['serializer'], RegistryMap['adapter']['application']>,
  keyof RegistryMap['adapter']
> &
  RegistryMap['adapter'];

type ResolvedRegistry<RegistryMap> = {
  model: RegistryMap['model'];
  transform: RegistryMap['transform'];
  serializer: ResolvedSerializerRegistry<RegistryMap>;
  adapter: ResolvedAdapterRegistry<RegistryMap>;
};
