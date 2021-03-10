// source/series.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import asyncerator, { Asyncable, Asyncerator } from '../asyncerator';

/**
 * Combine the output of iterators in a series.  Requires all the iterators to complete.
 *
 * @param iterators
 */
export default async function* <T>(...iterators: Asyncable<T>[]): Asyncerator<T> {
  for await (const iterator of iterators) {
    yield* asyncerator(iterator);
  }
}
