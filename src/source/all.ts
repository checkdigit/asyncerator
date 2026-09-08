// source/all.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import debug from 'debug';

import type { Asyncerator } from '../asyncerator.ts';

const log = debug('asyncerator:source:all');

/**
 * Similar to Promise.all(), but instead returns values as they become available via an Asyncerator.
 * Note: the output order is different from the input order, the fastest promise to resolve
 * will be first, the slowest last.
 *
 * @param promises
 */
export default async function* <T>(
  promises: Iterable<Promise<T>>,
): Asyncerator<T> {
  // as promises resolve, then remove from pending and add the result to the queue
  const queue: T[] = [];
  const promiseList = [...promises];
  const pending = new Set(promiseList);

  for (const [index, promise] of promiseList.entries()) {
    // eslint-disable-next-line @checkdigit/no-promise-instance-method
    promise
      // eslint-disable-next-line unicorn/prefer-await -- Register every promise concurrently so results arrive in completion order.
      .then((value) => {
        queue.push(value);
        pending.delete(promise);
        return value;
      })
      // eslint-disable-next-line unicorn/prefer-await -- Handle the detached callback's rejection without awaiting it.
      .catch((error: unknown) => {
        // we need to catch this, otherwise Node 14 will print an UnhandledPromiseRejectionWarning, and
        // future versions of Node will process.exit().
        log(`[${index}]`, error);
      });
  }

  // wait for the results to come in...
  while (pending.size > 0) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.race(pending);
    // eslint-disable-next-line unicorn/no-unnecessary-splice -- Drain into a separate array before yielding so promise callbacks can keep adding values.
    yield* queue.splice(0);
  }
}
