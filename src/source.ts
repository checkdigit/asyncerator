// source.ts

import create, { Asyncable, Asyncerator } from './create';

/**
 * Turn an Array (or any iterable) into an Asyncerator.
 *
 * @param source
 */
export function from<T>(
  source: Iterator<T> | Iterable<T> | AsyncIterator<T> | AsyncIterable<T> | (() => Asyncable<T>)
): Asyncerator<T> {
  let iterator: Iterator<T> | AsyncIterator<T>;

  if (typeof source === 'function') {
    return create(source);
  } else if (typeof (source as Asyncable<T>)[Symbol.asyncIterator] === 'function') {
    iterator = (source as Asyncable<T>)[Symbol.asyncIterator]();
    if (typeof (iterator as AsyncIterableIterator<T>)[Symbol.asyncIterator] === 'function') {
      // this is already an async iterable iterator, so we're good to go as-is
      return create(source as AsyncIterableIterator<T>);
    }
  } else if (typeof (source as IterableIterator<T>)[Symbol.iterator] === 'function') {
    // we know for sure this is a normal, synchronous iterator
    const synchronousIterator = (source as IterableIterator<T>)[Symbol.iterator]();
    // eslint-disable-next-line func-names
    return create(async function* () {
      for (let item = synchronousIterator.next(); !item.done; item = synchronousIterator.next()) {
        yield item.value;
      }
    });
  } else {
    // could be an Iterator or an AsyncIterator but we can't tell the difference, so treat it as async regardless
    iterator = source as AsyncIterator<T>;
  }

  // eslint-disable-next-line func-names
  return create(async function* () {
    // eslint-disable-next-line no-await-in-loop
    for (let item = await iterator.next(); !item.done; item = await iterator.next()) {
      yield item.value;
    }
  });
}

/**
 * Similar to Promise.all(), but instead returns values as they become available via an Asyncerator.
 * Note: the output order is not the same as the input order, the fastest promise to resolve
 * will be first, the slowest last.
 *
 * @param promises
 */
export function all<T>(promises: Iterable<Promise<T>>): Asyncerator<T> {
  // eslint-disable-next-line func-names
  return create(async function* () {
    const output: T[] = [];
    const pending = new Set(promises);

    for (const promise of promises) {
      promise
        .then((value) => {
          output.push(value);
          pending.delete(promise);
        })
        .catch(() => {
          // we don't handle the error here, will be taken care of below by the Promise.race()
        });
    }

    while (pending.size > 0) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.race([...pending]);
      for (const item of output) {
        yield item;
      }
      output.length = 0;
    }
  });
}

/**
 * Merge multiple async iterators into a single Asyncerator.  If an iterator yields another async iterator,
 * merge it's output into the stream.
 *
 * @param iterators
 */
export function merge<T>(...iterators: AsyncIterator<T | AsyncIterator<T>>[]): Asyncerator<T> {
  async function createPending<T>(iterator: AsyncIterator<T>, index: number) {
    return { index, iterator, result: await iterator.next() };
  }

  // eslint-disable-next-line func-names
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

/**
 * Combine the output of iterators in a series.  Requires all the iterators to complete.
 *
 * @param iterators
 */
export function series<T>(...iterators: Asyncable<T>[]): Asyncerator<T> {
  // eslint-disable-next-line func-names
  return create(async function* () {
    for await (const iterator of iterators) {
      for await (const item of iterator) {
        yield item;
      }
    }
  });
}
