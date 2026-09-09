// internal/iterator.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncable, Asyncerator } from '../asyncerator.ts';

export type SourceIterator<T> = Iterator<T> | AsyncIterator<T>;

export interface AcquiredIterator<T> {
  iterator: SourceIterator<T>;
  isSynchronous: boolean;
}

function wrapIterator<T>(
  iterator: Iterator<T> | AsyncIterator<T>,
  isSynchronous: boolean,
): AsyncIterableIterator<T> {
  let hasFinished = false;
  let hasFailed = false;
  let cleanup: Promise<void> | undefined;

  function close() {
    if (cleanup !== undefined) {
      return cleanup;
    }
    if (hasFinished) {
      return Promise.resolve();
    }
    const completion = Promise.withResolvers<undefined>();
    // Cache cleanup before invoking callbacks that may request cancellation again.
    cleanup = completion.promise;
    // Every outcome settles the cached promise while cleanup starts immediately.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      try {
        const result = await iterator.return?.();
        if (isSynchronous) {
          // Synchronous iterator completion values can contain asynchronous cleanup.
          await result?.value;
        }
        completion.resolve(undefined);
      } catch (error) {
        completion.reject(error);
      }
    })();
    return cleanup;
  }

  const wrapped = (async function* () {
    try {
      if (isSynchronous) {
        const synchronousIterator = iterator as Iterator<T>;
        for (
          let item = synchronousIterator.next();
          item.done !== true;
          item = synchronousIterator.next()
        ) {
          yield item.value;
        }
      } else {
        for (
          let item = await iterator.next();
          item.done !== true;
          // eslint-disable-next-line no-await-in-loop
          item = await iterator.next()
        ) {
          yield item.value;
        }
      }
      hasFinished = true;
    } catch (error) {
      hasFailed = true;
      throw error;
    } finally {
      try {
        await close();
      } catch (error) {
        if (!hasFailed) {
          // preserve the original iteration error when cleanup also fails.
          // eslint-disable-next-line no-unsafe-finally
          throw error;
        }
      }
    }
  })();

  const returnFromGenerator = wrapped.return.bind(wrapped);
  wrapped.return = async (value) => {
    // Generator return() waits for next(), so start cleanup first to unblock cancellable iterators.
    const [closing, returning] = await Promise.allSettled([
      close(),
      returnFromGenerator(value),
    ]);
    if (returning.status === 'rejected') {
      throw returning.reason;
    }
    if (!hasFailed && closing.status === 'rejected') {
      throw closing.reason;
    }
    return returning.value;
  };

  return wrapped;
}

/**
 * Acquire the underlying iterator without advancing or wrapping it.
 * Prefer the async iterable protocol over the sync protocol, calling the selected
 * method once with the source as its receiver. Bare iterators are treated as async.
 * Keeping the original iterator identity lets callers share adapters and cleanup.
 *
 * @param source The iterable or iterator to acquire.
 * @returns The underlying iterator and whether it uses the synchronous protocol.
 */
export function acquireIterator<T>(
  source: Asyncable<T> | (() => Asyncerator<T>),
): AcquiredIterator<T> {
  const acquireAsyncIterator = (source as AsyncIterable<T>)[
    Symbol.asyncIterator
  ];
  if (typeof acquireAsyncIterator === 'function') {
    return {
      iterator: acquireAsyncIterator.call(source),
      isSynchronous: false,
    };
  }

  const acquireSynchronousIterator = (source as Iterable<T>)[Symbol.iterator];
  if (typeof acquireSynchronousIterator === 'function') {
    return {
      iterator: acquireSynchronousIterator.call(source),
      isSynchronous: true,
    };
  }

  // Bare iterators do not identify their protocol, so treat their results as asynchronous.
  return { iterator: source as SourceIterator<T>, isSynchronous: false };
}

/**
 * Adapt an acquired iterator for use with `for await...of`.
 * For async sources, return an existing async iterable iterator unchanged.
 * Otherwise, wrap iteration and forward cancellation, sharing one cleanup operation
 * across repeated return() calls. The wrapper awaits synchronous cleanup values
 * and preserves the original iteration error if cleanup also fails.
 *
 * @returns The existing async iterable iterator or an adapter around it.
 */
export function adaptIterator<T>({
  iterator,
  isSynchronous,
}: AcquiredIterator<T>): AsyncIterableIterator<T> {
  if (
    !isSynchronous &&
    typeof (iterator as AsyncIterableIterator<T>)[Symbol.asyncIterator] ===
      'function'
  ) {
    return iterator as AsyncIterableIterator<T>;
  }

  return wrapIterator(iterator, isSynchronous);
}
