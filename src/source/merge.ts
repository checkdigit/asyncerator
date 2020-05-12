// source/merge.ts

import create, { Asyncerator } from '../create';

/**
 * Merge multiple async iterators into a single Asyncerator.  If an iterator yields another async iterator,
 * merge it's output into the stream.
 *
 * @param iterators
 */
export default function merge<T>(...iterators: AsyncIterator<T | AsyncIterator<T>>[]): Asyncerator<T> {
  async function createPending<T>(iterator: AsyncIterator<T>, index: number) {
    return { index, iterator, result: await iterator.next() };
  }

  return create(async function* () {
    const pending = iterators.map(createPending);
    const indexMap = iterators.map((value, index) => index);

    while (pending.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      const { result, iterator, index } = await Promise.race(pending);

      if (result.done) {
        // delete this iterable from pending
        pending.splice(indexMap[index], 1);
        for (let position = index + 1; position < indexMap.length; position++) {
          indexMap[position]--;
        }
      } else {
        if ((result.value as AsyncIterableIterator<T>)[Symbol.asyncIterator]) {
          // this is another async iterable iterator, so merge its output into the pending
          pending.push(
            (async (newIterator, newIndex) => {
              return {
                index: newIndex,
                iterator: newIterator,
                result: await newIterator.next(),
              };
            })(merge(result.value as AsyncIterableIterator<T>), indexMap.length)
          );
          indexMap.push(pending.length - 1);
        } else {
          yield result.value;
        }

        // start waiting for the next result from this iterable
        pending[indexMap[index]] = createPending(iterator, index);
      }
    }
  }) as Asyncerator<T>;
}
