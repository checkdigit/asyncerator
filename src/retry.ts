// retry.ts

import debug from 'debug';

const log = debug('checkdigit:retry');

const DEFAULT_WAIT_RATIO = 100;
const MAXIMUM_RETRIES = 8;

/**
 * A Retryable is an async function that given an item of type T, will asynchronously produce an item of type U with
 * standard Check Digit retry logic.  (8 retries, no more than 60 seconds per attempt)
 */
export type Retryable<T, U> = (item: T) => Promise<U>;

export interface RetryOptions {
  waitRatio?: number;
  maximumRetries?: number;
}

export class RetryError extends Error {
  constructor(public retries: number, public lastError: Error) {
    super(`Maximum retries (${retries}) exceeded`);
  }
}

/**
 * Item processor, with retry logic
 *
 * @param retryable
 * @param waitRatio how much to multiply 2^attempts by
 */
export default function <T, U>(retryable: Retryable<T, U>, waitRatio = DEFAULT_WAIT_RATIO): (item: T) => Promise<U> {
  return (item) =>
    (async function work(attempts = 0): Promise<U> {
      if (attempts > 0) {
        // wait for (2^attempts * 100) milliseconds (per AWS recommendation)
        const waitTime = 2 ** attempts * waitRatio;
        log(`attempt ${attempts}, waiting for ${waitTime}ms)`);
        await new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        });
      }

      const startTime = Date.now();
      try {
        return await retryable(item);
      } catch (error: unknown) {
        if (attempts >= MAXIMUM_RETRIES) {
          log(`maximumRetries (${MAXIMUM_RETRIES}) exceeded`);
          throw new RetryError(MAXIMUM_RETRIES, error as Error);
        }
        log(`attempt ${attempts} (fail in ${Date.now() - startTime}ms)`);
        return work(attempts + 1);
      }
    })();
}
