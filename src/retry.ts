// retry.ts

import debug from 'debug';

const log = debug('checkdigit:retry');

const MINIMUM_WAIT_RATIO = 0;
const DEFAULT_WAIT_RATIO = 100;
const MAXIMUM_WAIT_RATIO = 60000;

const MINIMUM_RETRIES = 0;
const DEFAULT_RETRIES = 8;
const MAXIMUM_RETRIES = 64;

/**
 * A Retryable is an async function that given an item of type T, will asynchronously produce an item of type U with
 * standard Check Digit retry logic.  (8 retries, no more than 60 seconds per attempt)
 */
export type Retryable<T, U> = (item: T) => Promise<U>;

export interface RetryOptions {
  waitRatio?: number;
  retries?: number;
}

export class RetryError extends Error {
  constructor(public retries: number, public lastError: Error) {
    super(`Maximum retries (${retries}) exceeded`);
  }
}

/**
 * Item processor, with retry logic
 *
 * @param waitRatio how much to multiply 2^attempts by
 * @param maximumRetries maximum number of retries before throwing a RetryError
 */
export default function <T, U>(
  { waitRatio = DEFAULT_WAIT_RATIO, retries = DEFAULT_RETRIES }: RetryOptions = {
    waitRatio: DEFAULT_WAIT_RATIO,
    retries: DEFAULT_RETRIES,
  }
): (retryable: Retryable<T, U>) => (item: T) => Promise<U> {
  if (waitRatio < MINIMUM_WAIT_RATIO || waitRatio > MAXIMUM_WAIT_RATIO) {
    throw RangeError(`waitRatio must be >= ${MINIMUM_WAIT_RATIO} and <= ${MAXIMUM_WAIT_RATIO}`);
  }
  if (retries < MINIMUM_RETRIES || retries > MAXIMUM_RETRIES) {
    throw RangeError(`retries must be >= ${MINIMUM_RETRIES} and <= ${MAXIMUM_RETRIES}`);
  }

  return (retryable: Retryable<T, U>) => (item) =>
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
        if (attempts >= retries) {
          log(`retries (${retries}) exceeded`);
          throw new RetryError(retries, error as Error);
        }
        log(`attempt ${attempts} (fail in ${Date.now() - startTime}ms)`);
        return work(attempts + 1);
      }
    })();
}
