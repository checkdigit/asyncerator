// sink/to-array.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import asyncerator, { Asyncable } from '../asyncerator';

/**
 * Turn an async iterable iterator into an Array.
 * This will wait until the iterator is done before returning an array, so be careful using this
 * with endless iterators (in other words, don't do that).
 */
export default async function <T>(iterator: Asyncable<T>): Promise<T[]> {
  const results = [];
  for await (const result of asyncerator(iterator)) {
    results.push(result);
  }
  return results;
}
