// source/merge.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import from, { type Asyncable, type Asyncerator } from '../asyncerator.ts';

type MergeValue<T> = T | Asyncable<T> | Promise<T>;

async function createPending<U>(
  iterator: AsyncIterableIterator<U>,
  index: number,
) {
  return { index, iterator, result: await iterator.next() };
}

/**
 * Merge multiple asyncables into a single Asyncerator.  If an iterator yields another Asyncerator,
 * merge its output into the stream.
 *
 * @param iterators
 */
export default async function* merge<T>(
  ...iterators: Asyncable<MergeValue<T>>[]
): Asyncerator<T> {
  const active = new Set<AsyncIterableIterator<MergeValue<T>>>();
  type SourceIterator = Iterator<MergeValue<T>> | AsyncIterator<MergeValue<T>>;
  const wrappedSources = new WeakMap<
    SourceIterator,
    AsyncIterableIterator<MergeValue<T>>
  >();
  let hasThrown = false;

  function trackIterator(source: Asyncable<MergeValue<T>>) {
    const iterable = source as Partial<
      Iterable<MergeValue<T>> & AsyncIterable<MergeValue<T>>
    >;
    let candidate = source as SourceIterator;
    let normalizedSource = source;

    // Acquire each source once and share adapters by the underlying iterator's identity.
    const acquireAsyncIterator = iterable[Symbol.asyncIterator];
    if (typeof acquireAsyncIterator === 'function') {
      const acquired = acquireAsyncIterator.call(source);
      candidate = acquired;
      normalizedSource = { [Symbol.asyncIterator]: () => acquired };
    } else {
      const acquireIterator = iterable[Symbol.iterator];
      if (typeof acquireIterator === 'function') {
        const acquired = acquireIterator.call(source);
        candidate = acquired;
        normalizedSource = { [Symbol.iterator]: () => acquired };
      }
    }

    let iterator = wrappedSources.get(candidate);
    iterator ??= from(normalizedSource)[Symbol.asyncIterator]();
    wrappedSources.set(candidate, iterator);
    active.add(iterator);
    return iterator;
  }

  try {
    const wrappedIterators = iterators.map(trackIterator);
    const pending = wrappedIterators.map(createPending);
    const indexMap = wrappedIterators.map((_, index) => index);

    while (pending.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      const { result, iterator, index } = await Promise.race(pending);

      if (result.done === true) {
        active.delete(iterator);
        // delete this iterable from pending
        // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style,@typescript-eslint/no-floating-promises
        pending.splice(indexMap[index] as number, 1);
        for (let position = index + 1; position < indexMap.length; position++) {
          indexMap[position] = (indexMap[position] ?? 0) - 1;
        }
      } else {
        if (
          typeof (
            result.value as AsyncIterableIterator<T> | null | undefined
          )?.[Symbol.asyncIterator] === 'function'
        ) {
          // this is another async iterable iterator, so merge its output into the pending
          pending.push(
            createPending(
              trackIterator(result.value as AsyncIterableIterator<T>),
              indexMap.length,
            ),
          );
          indexMap.push(pending.length - 1);
        } else {
          yield result.value as T;
        }

        // start waiting for the next result from this iterable
        // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
        pending[indexMap[index] as number] = createPending(iterator, index);
      }
    }
  } catch (error) {
    hasThrown = true;
    throw error;
  } finally {
    // Start every close operation even if another source's cleanup fails or waits.
    const results = await Promise.allSettled(
      [...active].map(async (iterator) => {
        await iterator.return?.();
      }),
    );
    if (!hasThrown) {
      for (const result of results) {
        if (result.status === 'rejected') {
          // report cleanup failures only when there is no original iteration error.
          // eslint-disable-next-line no-unsafe-finally
          throw result.reason;
        }
      }
    }
  }
}
