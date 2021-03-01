// source/all.ts

import debug from 'debug';
import type { Asyncerator } from '../asyncerator';

const log = debug('asyncerator:source:all');

/**
 * Similar to Promise.all(), but instead returns values as they become available via an Asyncerator.
 * Note: the output order is not the same as the input order, the fastest promise to resolve
 * will be first, the slowest last.
 *
 * @param promises
 */
export default async function* <T>(promises: Iterable<Promise<T>>): Asyncerator<T> {
  // as promises resolve, then remove from pending and add result to the queue
  const queue: T[] = [];
  const pending = new Set(promises);

  [...promises].map((promise, index) =>
    promise
      .then((value) => {
        queue.push(value);
        pending.delete(promise);
        return value;
      })
      .catch((reason: unknown) => {
        // we need to catch this, otherwise Node 14 will print an UnhandledPromiseRejectionWarning, and
        // future versions of Node will process.exit().
        log(`[${index}]`, reason);
      })
  );

  // wait for the results to come in...
  while (pending.size > 0) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.race(pending);
    while (queue.length > 0) {
      yield queue.pop() as T;
    }
  }
}
