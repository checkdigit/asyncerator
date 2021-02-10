// retry.ts

import debug from 'debug';

const log = debug('retry');

const DEFAULT_WAIT_RATIO = 100;
const MAX_RETRIES = 8;

/**
 * A Retryable is an async function that given an item of type T, will asynchronously produce an item of type U with
 * standard Check Digit retry logic.  (8 retries, no more than 60 seconds per attempt)
 */
export type Retryable<T, U> = (item: T) => Promise<U>;

/**
 * Item processor, with retry logic
 *
 * @param retryable
 * @param waitRatio how much to multiply 2^attempts by
 */
export default function <T, U>(retryable: Retryable<T, U>, waitRatio = DEFAULT_WAIT_RATIO): (item: T) => Promise<U> {
  // const timeoutWorker = timeout(TIMEOUT);
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
      } catch (err: unknown) {
        if (attempts >= MAX_RETRIES) {
          log(`MAX_RETRIES (${MAX_RETRIES}) exceeded`);
          throw err;
        }
        log(`attempt ${attempts} (fail in ${Date.now() - startTime}ms)`);
        return work(attempts + 1);
      }
    })();
}
