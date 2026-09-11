// asyncerator.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { acquireIterator, adaptIterator } from './internal/iterator.ts';

/**
 * Shared async iteration interface for the library's sources, operators and sinks.
 * Async generator objects, Node readable streams and iterable async iterators satisfy this interface.
 *
 * Like AsyncIterable<T>, an Asyncerator can be consumed with `for await...of` without having its own `next()` method.
 * It additionally guarantees that [Symbol.asyncIterator]() returns an iterator that is itself async iterable.
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
