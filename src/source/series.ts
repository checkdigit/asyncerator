// source/series.ts

import create, { Asyncable, Asyncerator } from '../create';

/**
 * Combine the output of iterators in a series.  Requires all the iterators to complete.
 *
 * @param iterators
 */
export default function <T>(...iterators: Asyncable<T>[]): Asyncerator<T> {
  // eslint-disable-next-line func-names
  return create(async function* () {
    for await (const iterator of iterators) {
      for await (const item of iterator) {
        yield item;
      }
    }
  });
}
