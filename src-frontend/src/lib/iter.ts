/** biome-ignore-all lint/style/useConsistentTypeDefinitions: to merge declaration */

declare global {
  interface Array<T> {
    reverseIter(): IterableIterator<T>;
  }
  interface ReadonlyArray<T> {
    reverseIter(): IterableIterator<T>;
  }
}

Object.defineProperty(Array.prototype, "reverseIter", {
  *value<T>(): IterableIterator<T> {
    for (let i = this.length - 1; i >= 0; i--) {
      yield this[i];
    }
  },
  configurable: true,
  writable: true,
});

export {};
