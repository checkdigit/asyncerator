// source/all.ts

import create, { Asyncerator } from '../create';

/**
 * Similar to Promise.all(), but instead returns values as they become available via an Asyncerator.
 * Note: the output order is not the same as the input order, the fastest promise to resolve
 * will be first, the slowest last.
 *
 * @param promises
 */
export default function <T>(promises: Iterable<Promise<T>>): Asyncerator<T> {
  return create(async function* () {
    const output: T[] = [];
    const pending = new Set(promises);

    for (const promise of promises) {
      promise
        .then((value) => {
          output.push(value);
          pending.delete(promise);
        })
        .catch(() => {
          // we don't handle the error here, will be taken care of below by the Promise.race()
        });
    }

    while (pending.size > 0) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.race([...pending]);
      for (const item of output) {
        yield item;
      }
      output.length = 0;
    }
  });
}
