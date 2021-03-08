// source/merge.ts

import from, { Asyncable, Asyncerator } from '../asyncerator';

async function createPending<U>(asyncerator: Asyncerator<U>, index: number) {
  const iterator = asyncerator[Symbol.asyncIterator]();
  return { index, iterator, result: await iterator.next() };
}

/**
 * Merge multiple asyncables into a single Asyncerator.  If an iterator yields another Asyncerator,
 * merge it's output into the stream.
 *
 * @param iterators
 */
export default async function* merge<T>(...iterators: Asyncable<T | Asyncable<T>>[]): Asyncerator<T> {
  const wrappedIterators = iterators.map(from);

  const pending = wrappedIterators.map(createPending);
  const indexMap = wrappedIterators.map((_, index) => index);

  while (pending.length > 0) {
    // eslint-disable-next-line no-await-in-loop
    const { result, iterator, index } = await Promise.race(pending);

    if (result.done) {
      // delete this iterable from pending
      pending.splice(indexMap[index] as number, 1);
      for (let position = index + 1; position < indexMap.length; position++) {
        indexMap[position]--;
      }
    } else {
      if ((result.value as AsyncIterableIterator<T>)[Symbol.asyncIterator]) {
        // this is another async iterable iterator, so merge its output into the pending
        pending.push(createPending(from(result.value as AsyncIterableIterator<T>), indexMap.length));
        indexMap.push(pending.length - 1);
      } else {
        yield result.value as T;
      }

      // start waiting for the next result from this iterable
      pending[indexMap[index] as number] = createPending(iterator, index);
    }
  }
}
