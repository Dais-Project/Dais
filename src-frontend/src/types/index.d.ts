type MustOneOf<T> = {
  [K in keyof T]: Required<Pick<T, K>> &
    Partial<Record<Exclude<keyof T, K>, never>>;
}[keyof T];
