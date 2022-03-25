// asyncerator.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
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
 * - NodeJS.ReadableStream (internal Node implementations include stream.Readable, readline, fs.createReadStream, etc)
 * - the standard Javascript `for await...of` statement will accept an Asyncerator
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
export type Asyncable<T> = Iterator<T> | Iterable<T> | AsyncIterator<T> | AsyncIterable<T> | Asyncerator<T>;

/**
 * Create an Asyncerator from an Asyncable.
 *
 * @param source
 */
export default function <T>(source: Asyncable<T> | (() => Asyncerator<T>)): Asyncerator<T> {
  let iterator: Iterator<T> | AsyncIterator<T>;

  if (typeof (source as Asyncerator<T>)[Symbol.asyncIterator] === 'function') {
    iterator = (source as Asyncerator<T>)[Symbol.asyncIterator]();
    if (typeof (iterator as AsyncIterableIterator<T>)[Symbol.asyncIterator] === 'function') {
      // this is already an async iterable iterator, so we're good to go as-is
      return iterator as AsyncIterableIterator<T>;
    }
  } else if (typeof (source as IterableIterator<T>)[Symbol.iterator] === 'function') {
    // we know for sure this is a normal, synchronous iterator
    const synchronousIterator = (source as IterableIterator<T>)[Symbol.iterator]();
    return (async function* () {
      for (let item = synchronousIterator.next(); !item.done; item = synchronousIterator.next()) {
        yield item.value;
      }
    })();
  } else {
    // could be an Iterator or an AsyncIterator but we can't tell the difference, so treat it as async regardless
    iterator = source as AsyncIterator<T>;
  }

  return (async function* () {
    // eslint-disable-next-line no-await-in-loop
    for (let item = await iterator.next(); !item.done; item = await iterator.next()) {
      yield item.value;
    }
  })();
}
