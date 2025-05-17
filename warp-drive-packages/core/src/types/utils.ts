export type WithPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };
