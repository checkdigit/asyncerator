// worker/dynamic.ts

import debug from 'debug';

import itemRetryable from './retry';
import type { AsyncWork, AsyncWorker } from './index';

const log = debug('async-work:map-dynamic');

/**
 * Dynamically adjust amount of concurrent work being done based on errors and timing of the underlying infrastructure.
 *
 * The basic strategy is to keep latency between 2x and 3x minimum time (calculated from 100 last transactions).
 * If an elapsed time is fast (less than 1000ms or 2x min), increase concurrency - but no more than once per second.
 * If an elapsed time is slow (more than 1000ms and 3x min), decrease concurrency.
 * If an error occurs, half concurrency.
 *
 * In other words, conservative ramping up concurrency, aggressive at ramping down.
 *
 * @param worker Worker function
 * @param waitRatio how much to multiply 2^attempts by
 */
// eslint-disable-next-line no-magic-numbers
export default function <T, U>(worker: AsyncWorker<T, U>, waitRatio = 100): AsyncWork<T, U> {
  const process = itemRetryable(waitRatio)(worker);
  // eslint-disable-next-line sonarjs/cognitive-complexity
  return async (items: T[]): Promise<U[]> => {
    const MAX_CONCURRENT = 64;
    const MIN_CONCURRENT = 4;
    const MAX_TIMES = 100;
    const LOW_CUT_OFF = 1000;
    const HIGH_CUT_OFF = 10000;
    const CONCURRENCY_CHANGE_PERIOD = 1000;

    let allowedConcurrent = MIN_CONCURRENT;
    let errorCount = 0;
    let doneCount = 0;
    let doingCount = 0;

    let lastConcurrencyChange = Date.now();

    const times: number[] = [];

    let delay = 0;

    const todo = [];
    const results: U[] = [];

    let index = 0;
    let error: { code: string; message: string } | undefined;

    let doneLastSecondCount = 0;
    let donePriorSecondCount = 0;
    let minimumElapsedTimeLastSecond = Infinity;
    let maximumElapsedTimeLastSecond = 0;
    let totalElapsedTimeLastSecond = 0;

    function logger() {
      if (doneLastSecondCount > 0) {
        // generate a log statement every second
        log(
          `${doneCount}/${items.length}: ${doingCount} concurrent @ ` +
            `${doneLastSecondCount}/s, ${errorCount} errors` +
            ` (${minimumElapsedTimeLastSecond}/${Math.floor(totalElapsedTimeLastSecond / doneLastSecondCount)}` +
            `/${maximumElapsedTimeLastSecond})`
        );
      }
      donePriorSecondCount = doneLastSecondCount;
      doneLastSecondCount = 0;
      minimumElapsedTimeLastSecond = Infinity;
      maximumElapsedTimeLastSecond = 0;
      totalElapsedTimeLastSecond = 0;
    }

    // eslint-disable-next-line no-magic-numbers
    const logIntervalTimer = setInterval(logger, 1000);

    while (results.length < items.length) {
      if (typeof error !== 'undefined') {
        clearInterval(logIntervalTimer);
        throw error;
      }

      // wait until the end of the event loop, allow some IO to occur...
      // eslint-disable-next-line no-await-in-loop
      await new Promise(setImmediate);

      // if we're doing more than we should, don't add anything more
      if (doingCount >= allowedConcurrent) {
        continue;
      }

      // if nothing to do, add something
      if (todo.length === 0 && index < items.length) {
        todo.push({
          attempts: 0,
          elapsed: 0,
          index,
          item: items[index++] as T,
        });
      }

      const work = todo.pop();

      if (work === undefined) {
        // nothing new to be processed
        continue;
      }

      // if there's some accumulated delay time, wait before processing any further work
      const waitTime = donePriorSecondCount === 0 ? Math.ceil(delay) : Math.ceil(delay * donePriorSecondCount);
      delay = 0;
      if (waitTime > 0) {
        log(`start waiting for ${waitTime}`);
        // eslint-disable-next-line no-await-in-loop,no-loop-func
        await new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        });
        log(`finished waiting for ${waitTime}`);
      }

      // eslint-disable-next-line require-atomic-updates
      doingCount += 1;

      /*
       * Process the work item.  We do not await the resulting promise; this allows us to scale up and process
       * multiple items in parallel.
       */
      process(work)
        // eslint-disable-next-line no-loop-func
        .then((processedWork) => {
          if (typeof processedWork.result === 'undefined') {
            // an error occurred
            doingCount -= 1;
            errorCount += 1;
            todo.push(processedWork);
            log(`error processing item ${index}`, processedWork.lastError);

            // reset the array used to calculate mean times
            times.length = 0;

            // because of the error, halve the amount of concurrent work being done
            allowedConcurrent = Math.floor(allowedConcurrent / 2);
            if (allowedConcurrent < MIN_CONCURRENT) {
              allowedConcurrent = MIN_CONCURRENT;
            }

            // if there is a retryDelay property on the error, add it onto the main delay counter
            if (
              typeof processedWork.lastError !== 'undefined' &&
              typeof processedWork.lastError.retryDelay === 'number'
            ) {
              delay += processedWork.lastError.retryDelay;
              log(`setting delay to ${delay}`);
            }
            return;
          }

          results.push(processedWork.result);
          doingCount -= 1;
          doneCount += 1;
          doneLastSecondCount += 1;

          totalElapsedTimeLastSecond += processedWork.elapsed;
          minimumElapsedTimeLastSecond =
            processedWork.elapsed < minimumElapsedTimeLastSecond ? processedWork.elapsed : minimumElapsedTimeLastSecond;
          maximumElapsedTimeLastSecond =
            processedWork.elapsed > maximumElapsedTimeLastSecond ? processedWork.elapsed : maximumElapsedTimeLastSecond;

          times.push(processedWork.elapsed);
          if (times.length > MAX_TIMES) {
            times.shift();
          }

          if (Date.now() > lastConcurrencyChange + CONCURRENCY_CHANGE_PERIOD) {
            // its been a while, lets see if we should change the concurrency level
            const minimumTime = Math.min(...times);
            // eslint-disable-next-line id-length
            const averageTime = Math.floor(times.reduce((a, b) => a + b) / times.length);
            lastConcurrencyChange = Date.now();

            if ((averageTime < LOW_CUT_OFF || averageTime < minimumTime * 2) && averageTime < HIGH_CUT_OFF) {
              // that was fast, and more than a second since last change, so increase throughput 10%
              // eslint-disable-next-line no-magic-numbers
              allowedConcurrent = Math.ceil(allowedConcurrent * 1.1);
              if (allowedConcurrent > MAX_CONCURRENT) {
                allowedConcurrent = MAX_CONCURRENT;
              }
            }

            // eslint-disable-next-line no-magic-numbers
            if ((averageTime >= LOW_CUT_OFF && averageTime > minimumTime * 3) || averageTime > HIGH_CUT_OFF) {
              // slow, and more than a second since last change, decrease throughput 10%
              // eslint-disable-next-line no-magic-numbers
              allowedConcurrent = Math.floor(allowedConcurrent / 1.1);
              if (allowedConcurrent < MIN_CONCURRENT) {
                allowedConcurrent = MIN_CONCURRENT;
              }
            }
          }
        })
        // eslint-disable-next-line no-loop-func
        .catch((err: unknown) => {
          error = err as { code: string; message: string };
          log(`failed, exiting (code: ${error.code}, message: ${error.message})`, err);
        });
    }

    // print out final stats
    logger();
    clearInterval(logIntervalTimer);
    return results;
  };
}
