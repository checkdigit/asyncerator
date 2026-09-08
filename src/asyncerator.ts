// asyncerator.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

/*
 * An Asyncerator is the minimum common `for-await` compatible interface that both NodeJS.ReadableStream and
 * AsyncIterableIterator implement.  It's a useful construct to be used with the pipeline function, since it allows
 * AsyncIterables and Node stream-based objects to be combined in various convenient ways.
 *
 * The follow Node built-ins implement the Asyncerator interface:
 * - AsyncIterableIterator
 * - AsyncGenerator (aka async generator functions)
 * - NodeJS.ReadableStream (internal Node implementations include stream.Readable, readline, fs.createReadStream, etc.)
 * - the standard JavaScript `for await...of` statement will accept an Asyncerator
 *
 * Notes:
 * - Asyncerator is similar to AsyncIterableIterator, but does not extend AsyncIterator.
 * - It's also similar to AsyncIterable, but [Symbol.asyncIterator]() returns an AsyncIterableIterator instead of an AsyncIterator.
 *
 */

export interface Asyncerator<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}

/**
 * Asyncables are anything that can be turned into an Asyncerator: normal iterators and iterables, AsyncIterators,
 * AsyncIterables, AsyncGenerators, AsyncIterableIterators, and of course Asyncerators themselves.
 */
export type Asyncable<T> =
  | Iterator<T>
  | Iterable<T>
  | AsyncIterator<T>
  | AsyncIterable<T>
  | Asyncerator<T>;

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
    cleanup = (async () => {
      await iterator.return?.();
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
 * Create an Asyncerator from an Asyncable.
 *
 * @param source
 */
export default function <T>(
  source: Asyncable<T> | (() => Asyncerator<T>),
): Asyncerator<T> {
  let iterator: Iterator<T> | AsyncIterator<T>;

  if (typeof (source as Asyncerator<T>)[Symbol.asyncIterator] === 'function') {
    iterator = (source as Asyncerator<T>)[Symbol.asyncIterator]();
    if (
      typeof (iterator as AsyncIterableIterator<T>)[Symbol.asyncIterator] ===
      'function'
    ) {
      // this is already an async iterable iterator, so we're good to go as-is
      return iterator as AsyncIterableIterator<T>;
    }
  } else if (
    typeof (source as IterableIterator<T>)[Symbol.iterator] === 'function'
  ) {
    // we know for sure this is a normal, synchronous iterator
    const synchronousIterator = (source as IterableIterator<T>)[
      Symbol.iterator
    ]();
    return wrapIterator(synchronousIterator, true);
  } else {
    // could be an Iterator or an AsyncIterator, but we can't tell the difference, so treat it as async regardless
    iterator = source as AsyncIterator<T>;
  }

  return wrapIterator(iterator, false);
}
