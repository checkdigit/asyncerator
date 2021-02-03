// create.ts

import * as operator from './operator';
import * as sink from './sink';

/**
 * Asyncerator extends AsyncIterableIterator to provide standard Array-like utility operators.
 */
export interface Asyncerator<T> extends AsyncIterableIterator<T> {
  map<U>(mapFunction: (value: T) => U): Asyncerator<U>;
  flat(depth?: number): Asyncerator<T extends (infer U)[] ? U : T>;
  race<U>(raceFunction: (value: T) => Promise<U>, concurrent?: number): Asyncerator<U>;
  filter(filterFunction: (value: T) => boolean): Asyncerator<T>;
  filter<U extends T>(filterFunction: (value: T) => value is U): Asyncerator<U>;
  forEach(forEachFunction: (value: T) => void): Asyncerator<T>;
  before(beforeFunction: () => T | void): Asyncerator<T>;
  after(afterFunction: () => T | void): Asyncerator<T>;
  error(errorFunction: (error: Error) => void): Asyncerator<T>;
  split(separator: string, limit?: number): Asyncerator<string>;
  toArray(): Promise<T[]>;
  drop(): Promise<void>;
}

/*
 * Asyncable is similar to AsyncIterableIterator, but does not extend AsyncIterator.   It's also similar to
 * AsyncIterable, but [Symbol.asyncIterator]() returns an AsyncIterableIterator instead of an AsyncIterator.  Got it?
 * 1) It is still compatible with for-await.
 * 2) This should be defined in a standard library somewhere, since this interface is that many node modules
 *    (e.g. readline, streaming stuff) actually implement.
 * 3) Yes it's annoying.
 */
export interface Asyncable<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}

/**
 * Create an Asyncerator from an Asyncable, or a function that returns an Asyncable.
 *
 * @param source
 */
function create<T>(source: Asyncable<T> | (() => Asyncable<T>)): Asyncerator<T> {
  const iterator = typeof source === 'function' ? source()[Symbol.asyncIterator]() : source[Symbol.asyncIterator]();
  return {
    [Symbol.asyncIterator]() {
      return iterator;
    },
    next(...args) {
      return iterator.next(...args);
    },
    ...(typeof iterator.return !== 'undefined'
      ? {
          return(...args) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return iterator.return(...args);
          },
        }
      : {}),
    ...(typeof iterator.throw !== 'undefined'
      ? {
          throw(...args) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return iterator.throw(...args);
          },
        }
      : {}),
    map: (mapFunction) => create(operator.map(iterator, mapFunction)),
    race: (raceFunction, concurrent) => create(operator.race(iterator, raceFunction, concurrent)),
    flat: (depth) => create(operator.flat(iterator, depth)),
    filter: (filterFunction: (value: T) => boolean) => create(operator.filter(iterator, filterFunction)),
    split: (separator: string, limit?: number) => create(operator.split(iterator, separator, limit)),
    forEach: (tapFunction) => create(operator.forEach(iterator, tapFunction)),
    before: (beforeFunction) => create(operator.before(iterator, beforeFunction)),
    after: (afterFunction) => create(operator.after(iterator, afterFunction)),
    error: (errorFunction) => create(operator.error(iterator, errorFunction)),
    toArray: () => sink.toArray(iterator),
    drop: () => sink.drop(iterator),
  };
}

export default create;
