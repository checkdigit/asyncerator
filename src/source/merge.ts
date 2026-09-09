// source/merge.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncable, Asyncerator } from '../asyncerator.ts';

import {
  acquireIterator,
  adaptIterator,
  type SourceIterator,
} from '../internal/iterator.ts';

type MergeValue<T> = T | Asyncable<T> | Promise<T>;

interface Source<T> {
  iterator: AsyncIterableIterator<T>;
}

interface PendingResult<T> {
  source: Source<T>;
  result: IteratorResult<T>;
}

async function createPending<T>(source: Source<T>): Promise<PendingResult<T>> {
  return { source, result: await source.iterator.next() };
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
  const wrappedSources = new WeakMap<
    SourceIterator<MergeValue<T>>,
    AsyncIterableIterator<MergeValue<T>>
  >();
  let hasThrown = false;

  function createSource(source: Asyncable<MergeValue<T>>) {
    const acquired = acquireIterator(source);
    let iterator = wrappedSources.get(acquired.iterator);
    iterator ??= adaptIterator(acquired);
    wrappedSources.set(acquired.iterator, iterator);
    active.add(iterator);
    // Each occurrence gets its own read, while shared iterators have one cleanup.
    return { iterator };
  }

  try {
    const sources = iterators.map(createSource);
    const pending = new Map<
      Source<MergeValue<T>>,
      Promise<PendingResult<MergeValue<T>>>
    >();
    for (const source of sources) {
      pending.set(source, createPending(source));
    }

    while (pending.size > 0) {
      // eslint-disable-next-line no-await-in-loop
      const { result, source } = await Promise.race(pending.values());

      if (result.done === true) {
        active.delete(source.iterator);
        pending.delete(source);
      } else {
        if (
          typeof (
            result.value as AsyncIterableIterator<T> | null | undefined
          )?.[Symbol.asyncIterator] === 'function'
        ) {
          const nested = createSource(result.value as AsyncIterableIterator<T>);
          pending.set(nested, createPending(nested));
        } else {
          yield result.value as T;
        }

        // Replacing a read preserves source priority when several results are ready.
        pending.set(source, createPending(source));
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
