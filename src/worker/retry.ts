// worker/retry.ts

import debug from 'debug';

import timeout from './timeout';
import type { AsyncWorker } from './index';

const log = debug('asyncerator:worker:retry');

const DEFAULT_WAIT_RATIO = 100;
const TIMEOUT = 60000;
const MAX_RETRIES = 8;

interface RetryableWork<T, U> {
  attempts: number;
  item: T;
  index: number;
  elapsed: number;
  result?: U;
  lastError?: { retryDelay: number };
}

/**
 * Item processor, with retry logic
 *
 * @param waitRatio how much to multiply 2^attempts by
 */
export default function (waitRatio = DEFAULT_WAIT_RATIO) {
  const timeoutWorker = timeout(TIMEOUT);
  return <T, U>(worker: AsyncWorker<T, U>): ((work: RetryableWork<T, U>) => Promise<RetryableWork<T, U>>) => {
    return async ({ item, index, attempts }: RetryableWork<T, U>) => {
      if (attempts > 0) {
        // wait for (2^attempts * 100) milliseconds (per AWS recommendation)
        const waitTime = 2 ** attempts * waitRatio;
        log(`item ${index}: attempt ${attempts}, waiting for ${waitTime}ms)`);
        await new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        });
      }

      const startTime = Date.now();
      try {
        const result = await timeoutWorker(worker(item));
        if (attempts > 0) {
          log(`item ${index}: attempt ${attempts} (success in ${Date.now() - startTime}ms)`);
        }
        return {
          attempts: attempts + 1,
          elapsed: Date.now() - startTime,
          index,
          item,
          result,
        };
      } catch (err: unknown) {
        if (attempts >= MAX_RETRIES) {
          throw Error(`MAX_RETRIES (${MAX_RETRIES}) exceeded: item ${index}`);
        }
        log(`item ${index}: attempt ${attempts} (fail in ${Date.now() - startTime}ms)`);
        return {
          attempts: attempts + 1,
          elapsed: Date.now() - startTime,
          index,
          item,
          lastError: err as { retryDelay: number },
        };
      }
    };
  };
}
