// source/series.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import asyncerator, {
  type Asyncable,
  type Asyncerator,
} from '../asyncerator.ts';

/**
 * Combine the output of iterators in a series.  Requires all the iterators to complete.
 *
 * @param iterators
 */
export default async function* <T>(
  ...iterators: Asyncable<T>[]
): Asyncerator<T> {
  for (const iterator of iterators) {
    yield* asyncerator(iterator);
  }
}
