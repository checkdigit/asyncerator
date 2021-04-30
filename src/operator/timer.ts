// operator/timer.ts

/*
 * Copyright (c) 2021 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

// import debug from 'debug';

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

// const log = debug('asyncerator:operator:timer');

/**
 * Apply stream of values to the raceFunction, emitting output values in order of completion.  By default, allows
 * up to 128 concurrent values to be processed.
 * @param timerFunction
 */
export default function <Input>(timerFunction: (sequence: number) => Promise<Input>): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    const queue: Input[] = [];
    let complete = false;
    let errorThrown = false;
    let completionError: unknown;

    /**
     * timer producer
     */

    try {
      (async () => {
        // before we do anything, allow the event loop to process.  If the iterator completes immediately, we do not
        // want any timerFunction execution.
        await new Promise(setImmediate);

        let currentIndex = 0;
        // eslint-disable-next-line no-unmodified-loop-condition
        while (!complete) {
          // eslint-disable-next-line no-await-in-loop
          queue.push(await timerFunction(currentIndex++));

          // timerFunction may resolve immediately, so we need to allow the event loop to process before repeating
          // eslint-disable-next-line no-await-in-loop
          await new Promise(setImmediate);
        }
      })().catch((error: unknown) => {
        errorThrown = true;
        completionError = error;
      });

      /**
       * queue producer, implemented using for-await
       */

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        for await (const item of iterator) {
          queue.push(item);
        }
        complete = true;
      })().catch((error: unknown) => {
        errorThrown = true;
        completionError = error;
      });

      /**
       * queue consumer, runs concurrently with the for-await producer above
       */

      // eslint-disable-next-line no-unmodified-loop-condition
      while (!complete && !errorThrown) {
        if (queue.length === 0) {
          // there's nothing pending yet, so let's wait until the end of the event loop and allow some IO to occur...
          // eslint-disable-next-line no-await-in-loop
          await new Promise(setImmediate);
        }

        // one or more promises have completed, so yield everything in the queue
        yield* queue.splice(0, queue.length);
      }
      if (errorThrown) {
        throw completionError;
      }
    } finally {
      complete = true;
    }
  };
}
