// retry.spec.ts

import assert from 'assert';

import retry, { RetryError } from './retry';

describe('retry', () => {
  function work(waiter: (callback: (...args: unknown[]) => void, ...args: unknown[]) => void, errorNumber = 0) {
    let errorCount = 0;
    return (value: unknown) =>
      new Promise((resolve, reject) => {
        errorCount++;
        if (errorCount < errorNumber) {
          waiter(() => reject(new Error(`Error ${errorCount}/${errorNumber}`)));
        } else {
          waiter(() => resolve(value));
        }
      });
  }

  const nextTick = process.nextTick.bind(process);

  it('returns resolved value if item resolves', async () => {
    assert.strictEqual(await retry(async (item: number) => item * 2)(8), 16);
    assert.strictEqual(await retry(work(nextTick))('abc'), 'abc');
    assert.strictEqual(await retry(work(setImmediate))('def'), 'def');
    assert.strictEqual(await retry(work((callback) => setTimeout(callback, 1)))('def'), 'def');
  });

  it('returns resolved value if item eventually resolves', async () => {
    assert.strictEqual(await retry(work(nextTick, 1), 0)(1n), 1n);
    assert.strictEqual(await retry(work(setImmediate, 8), 0)(123n), 123n);
    assert.strictEqual(
      await retry(
        work((callback) => setTimeout(callback, 2), 8),
        0
      )(123n),
      123n
    );
  });

  it('rejects if item reaches default MAXIMUM_RETRIES', async () => {
    let thrown;
    try {
      await retry(work(setImmediate, Infinity), 0)(8);
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown instanceof RetryError);
    assert.deepStrictEqual(thrown.retries, 8);
    assert.deepStrictEqual(thrown.lastError.message, 'Error 9/Infinity');
  });
});
