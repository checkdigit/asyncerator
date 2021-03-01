// source/series.ts

import asyncerator, { Asyncable, Asyncerator } from '../asyncerator';

/**
 * Combine the output of iterators in a series.  Requires all the iterators to complete.
 *
 * @param iterators
 */
export default async function* <T>(...iterators: Asyncable<T>[]): Asyncerator<T> {
  for await (const iterator of iterators) {
    yield* asyncerator(iterator);
  }
}
