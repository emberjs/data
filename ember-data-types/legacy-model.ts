import { DefaultRegistry, RegistryMap } from '.';

export type AsyncHasMany<RK extends R['model'][keyof R['model']], R extends RegistryMap = DefaultRegistry> = Promise<
  HasMany<RK, R>
> & { '___----RELATED_TYPE_KEY': RK };

export type AsyncBelongsTo<RK extends R['model'][keyof R['model']], R extends RegistryMap = DefaultRegistry> = Promise<
  BelongsTo<RK, R>
> & { '___----RELATED_TYPE_KEY': RK };

export type BelongsTo<RK extends R['model'][keyof R['model']], R extends RegistryMap = DefaultRegistry> = RK & {
  '___----RELATED_TYPE_KEY': RK;
};

export type HasMany<RK extends R['model'][keyof R['model']], R extends RegistryMap = DefaultRegistry> = RK[] & {
  '___----RELATED_TYPE_KEY': RK;
};
