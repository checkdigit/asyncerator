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
  // fulfilled values move to the queue. Rejected promises stay in pending until
  // Promise.race observes the failure, even if the consumer is currently paused.
  const queue: T[] = [];
  const promiseList = [...promises];
  const pending = new Set(promiseList);

  for (const [index, promise] of promiseList.entries()) {
    // eslint-disable-next-line @checkdigit/no-promise-instance-method
    promise
      // register every promise concurrently so results arrive in completion order.
      // eslint-disable-next-line unicorn/prefer-await
      .then((value) => {
        queue.push(value);
        pending.delete(promise);
        return value;
      })
      // handle the detached callback's rejection without awaiting it.
      // eslint-disable-next-line unicorn/prefer-await
      .catch((error: unknown) => {
        // handle the detached callback's rejection, keeping the original promise
        // in pending so the consumer still receives the error.
        log(`[${index}]`, error);
      });
  }

  // wait for the results to come in...
  while (pending.size > 0 || queue.length > 0) {
    if (queue.length === 0) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.race(pending);
    }
    // drain into a separate array before yielding so promise callbacks can keep adding values.
    // eslint-disable-next-line unicorn/no-unnecessary-splice
    yield* queue.splice(0);
  }
}
