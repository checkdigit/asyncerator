// operator/race.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import debug from 'debug';

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

const log = debug('asyncerator:operator:race');

const DEFAULT_CONCURRENT = 128;

/**
 * Apply stream of values to the raceFunction, emitting output values in order of completion.  By default, allows
 * up to 128 concurrent values to be processed.
 * @param raceFunction
 * @param concurrent
 */
export default function <Input, Output>(
  raceFunction: (value: Input) => Promise<Output>,
  concurrent = DEFAULT_CONCURRENT
): Operator<Input, Output> {
  return async function* (iterator: Asyncerator<Input>) {
    const queue: Output[] = [];
    const pending = new Set<Promise<void | Output>>();
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
        yield* queue.splice(0, queue.length);
      }
    }
    if (errorThrown) {
      throw completionError;
    }
  };
}
