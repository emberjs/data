// import { consumeTag, createCache, dirtyTag, getValue, track, type UpdatableTag, updateTag } from '@glimmer/validator';
type Tag = unknown;
type Memo<F> = { cb: () => F };

export function consumeTag(tag: Tag) {}

export function createCache<F>(fn: () => F): Memo<F>;

export function dirtyTag(tag: Tag): void;

export function getValue<F>(memo: Memo<F>): F;

export function track<F>(fn: () => F): Tag;

export function updateTag(tag: Tag, updated: Tag): void;
