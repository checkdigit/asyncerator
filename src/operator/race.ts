// operator/race.ts

import debug from 'debug';

const log = debug('asyncerator:operator:race');

const DEFAULT_CONCURRENT = 64;

export default async function* <T, U>(
  iterator: AsyncIterable<T>,
  raceFunction: (value: T) => Promise<U>,
  concurrent = DEFAULT_CONCURRENT
): AsyncGenerator<U, void, undefined> {
  const queue: U[] = [];
  const pending = new Set<Promise<void | U>>();
  let complete = false;
  let errorThrown = false;
  let completionError: unknown;

  /**
   * queue producer, implemented using for-await
   */

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  (async () => {
    for await (const item of iterator) {
      while (pending.size >= concurrent) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(setImmediate);
      }

      const promise = raceFunction(item);
      pending.add(promise);

      promise
        .then((value) => {
          // as promises resolve, then remove from pending and add result to the queue
          queue.push(value);
          pending.delete(promise);
          return value;
        })
        .catch((reason: unknown) => {
          // we need to catch this, otherwise Node 14 will print an UnhandledPromiseRejectionWarning, and
          // future versions of Node will process.exit().
          log(reason);
        });
    }
  })()
    .then(() => {
      complete = true;
    })
    .catch((error: unknown) => {
      errorThrown = true;
      completionError = error;
    });

  /**
   * queue consumer, runs concurrently with the for-await producer above
   */

  // eslint-disable-next-line no-unmodified-loop-condition
  while (!complete && !errorThrown) {
    if (pending.size === 0) {
      // there's nothing pending yet, so let's wait until the end of the event loop and allow some IO to occur...
      // eslint-disable-next-line no-await-in-loop
      await new Promise(setImmediate);
    }

    while (pending.size > 0 || queue.length > 0) {
      if (pending.size > 0) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.race(pending);
      }

      // one or more promises have completed, so yield everything in the queue
      while (queue.length > 0) {
        yield queue.pop() as U;
      }
    }
  }
  if (errorThrown) {
    throw completionError;
  }
}
