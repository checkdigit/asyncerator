// sink/to-string.ts

import asyncerator, { Asyncable } from '../asyncerator';

/**
 * Turn an async iterable iterator into a string.
 * This will wait until the iterator is done before returning, so be careful using this
 * with endless iterators (in other words, don't do that).
 */
export default async function <T>(iterator: Asyncable<T>): Promise<string> {
  let result = '';
  for await (const chunk of asyncerator(iterator)) {
    result += chunk;
  }
  return result;
}
