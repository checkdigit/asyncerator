// source/merge.ts

/*
 * Copyright (c) 2021-2024 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import from, { type Asyncable, type Asyncerator } from '../asyncerator';

async function createPending<U>(asyncerator: Asyncerator<U>, index: number) {
  const iterator = asyncerator[Symbol.asyncIterator]();
  return { index, iterator, result: await iterator.next() };
}

/**
 * Merge multiple asyncables into a single Asyncerator.  If an iterator yields another Asyncerator,
 * merge its output into the stream.
 *
 * @param iterators
 */
export default async function* merge<T>(...iterators: Asyncable<T | Asyncable<T> | Promise<T>>[]): Asyncerator<T> {
  const wrappedIterators = iterators.map(from);

  const pending = wrappedIterators.map(createPending);
  const indexMap = wrappedIterators.map((_, index) => index);

  while (pending.length > 0) {
    // eslint-disable-next-line no-await-in-loop
    const { result, iterator, index } = await Promise.race(pending);

    if (result.done === true) {
      // delete this iterable from pending
      // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
      pending.splice(indexMap[index] as number, 1);
      for (let position = index + 1; position < indexMap.length; position++) {
        indexMap[position]--;
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if ((result.value as AsyncIterableIterator<T>)[Symbol.asyncIterator] === undefined) {
        yield result.value as T;
      } else {
        // this is another async iterable iterator, so merge its output into the pending
        pending.push(createPending(from(result.value as AsyncIterableIterator<T>), indexMap.length));
        indexMap.push(pending.length - 1);
      }

      // start waiting for the next result from this iterable
      // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
      pending[indexMap[index] as number] = createPending(iterator, index);
    }
  }
}
