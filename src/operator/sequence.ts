// operator/sequence.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

/**
 * The sequenceFunction will be called repeatedly with an incrementing numerical parameter, returning a Promise
 * that resolves with the same type as Input and is inserted into the stream.  The sequence operator
 * passes through all other values.  Because the sequenceFunction returns a Promise, it
 * can delay its response (using setTimeout) to emit values on a regular schedule, e.g. once a second.
 *
 * @param sequenceFunction
 */
export default function <Input>(sequenceFunction: (index: number) => Promise<Input>): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    const queue: Input[] = [];
    let complete = false;
    let hasThrown = false;
    let errorThrown: unknown;

    /**
     * sequence producer
     */

    (async () => {
      // before we do anything, allow the event loop to process.  If the iterator completes immediately, we do not
      // want any sequenceFunction execution.
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      let currentIndex = 0;
      // eslint-disable-next-line no-unmodified-loop-condition,@typescript-eslint/no-unnecessary-condition
      while (!complete && !hasThrown) {
        // eslint-disable-next-line no-await-in-loop
        queue.push(await sequenceFunction(currentIndex++));

        // sequenceFunction may resolve immediately, so we need to allow the event loop to process before repeating
        // eslint-disable-next-line no-await-in-loop,no-loop-func
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      }
    })().catch((error: unknown) => {
      hasThrown = true;
      errorThrown = error;
    });

    /**
     * pass-through producer
     */

    const passThroughProducer = (async () => {
      for await (const item of iterator) {
        // if the sequence producer throws an error, exit immediately (effectively cancel this promise)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (hasThrown) {
          break;
        }
        queue.push(item);
      }
    })()
      .catch((error: unknown) => {
        hasThrown = true;
        errorThrown = error;
      })
      .finally(() => {
        complete = true;
      });

    /**
     * queue consumer, runs concurrently with the producers above
     */

    // eslint-disable-next-line no-unmodified-loop-condition,@typescript-eslint/no-unnecessary-condition
    while (!complete && !hasThrown) {
      if (queue.length === 0) {
        // there's nothing pending yet, so let's allow some IO to occur...
        // eslint-disable-next-line no-await-in-loop,no-loop-func
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      }

      // one or more promises may have completed, so yield everything in the queue
      yield* queue.splice(0, queue.length);
    }

    await passThroughProducer;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (hasThrown) {
      throw errorThrown;
    }
  };
}
