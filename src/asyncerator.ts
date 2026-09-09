// asyncerator.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { acquireIterator, adaptIterator } from './internal/iterator.ts';

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

/**
 * Create an Asyncerator from an Asyncable.
 *
 * @param source
 */
export default function <T>(
  source: Asyncable<T> | (() => Asyncerator<T>),
): Asyncerator<T> {
  return adaptIterator(acquireIterator(source));
}
