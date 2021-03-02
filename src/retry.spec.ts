// retry.spec.ts

import assert from 'assert';

import retry, { RetryError } from './retry';
import timeout from './timeout';

describe('retry', () => {
  function work(waiter: (callback: (...args: unknown[]) => void, ...args: unknown[]) => void, errorNumber = 0) {
    let errorCount = 0;
    return (value: unknown) =>
      new Promise((resolve, reject) => {
        if (errorCount < errorNumber) {
          errorCount++;
          waiter(() => reject(new Error(`Error ${errorCount}/${errorNumber}`)));
        } else {
          waiter(() => resolve(value));
        }
      });
  }

  const nextTick = process.nextTick.bind(process);

  it('returns resolved value if item resolves', async () => {
    assert.strictEqual(await retry<number, number>(async (item) => item * 2)(8), 16);

    assert.strictEqual(await retry(work(nextTick))('abc'), 'abc');
    assert.strictEqual(await retry(work(setImmediate))('def'), 'def');
    assert.strictEqual(await retry(work((callback) => setTimeout(callback, 1)))('def'), 'def');
  });

  it('returns resolved value if item eventually resolves', async () => {
    assert.strictEqual(await retry(work(nextTick, 1), { waitRatio: 0 })(1n), 1n);
    assert.strictEqual(await retry(work(setImmediate, 8), { waitRatio: 0 })(123n), 123n);
    assert.strictEqual(
      await retry(
        work((callback) => setTimeout(callback, 2), 8),
        { waitRatio: 0 }
      )(123n),
      123n
    );
  });

  it('rejects if item reaches DEFAULT_RETRIES (8)', async () => {
    let thrown;
    try {
      await retry(work(setImmediate, Infinity), { waitRatio: 0 })(8);
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown instanceof RetryError);
    assert.deepStrictEqual(thrown.retries, 8);
    assert.deepStrictEqual(thrown.lastError.message, 'Error 9/Infinity');
  });

  it('number of retries can be selected', async () => {
    assert.strictEqual(await retry(work(nextTick, 0), { retries: 0, waitRatio: 0 })(1n), 1n);
    await assert.rejects(
      async () => retry(work(nextTick, 2), { retries: 0, waitRatio: 0 })(1n),
      /^Error: Maximum retries \(0\) exceeded$/u
    );
    assert.strictEqual(await retry(work(nextTick, 0), { retries: 1, waitRatio: 0 })(1n), 1n);
    assert.strictEqual(await retry(work(nextTick, 1), { retries: 1, waitRatio: 0 })(1n), 1n);
    await assert.rejects(
      async () => retry(work(nextTick, 2), { retries: 1, waitRatio: 0 })(1n),
      /^Error: Maximum retries \(1\) exceeded$/u
    );
  });

  it('throws RangeError on invalid waitRatio values', async () => {
    const expectedRangeError = /^RangeError: waitRatio must be >= 0 and <= 60000$/u;
    assert.throws(() => retry(work(nextTick), { waitRatio: -1 }), expectedRangeError);
    retry(work(nextTick));
    retry(work(nextTick), {});
    retry(work(nextTick), { waitRatio: 1 });
    retry(work(nextTick), { waitRatio: 60000 });
    assert.throws(() => retry(work(nextTick), { waitRatio: 60001 }), expectedRangeError);
  });

  it('throws RangeError on invalid retries values', async () => {
    const expectedRangeError = /^RangeError: retries must be >= 0 and <= 64$/u;
    assert.throws(() => retry(work(nextTick), { retries: -1 }), expectedRangeError);
    retry(work(nextTick));
    retry(work(nextTick), {});
    retry(work(nextTick), { retries: 1 });
    retry(work(nextTick), { retries: 64 });
    assert.throws(() => retry(work(nextTick), { retries: 65 }), expectedRangeError);
  });

  it('works in parallel (using timeout)', async () => {
    const range = [...Array(10000).keys()].map((index) => index.toString().padStart(4, '0'));
    const worker = retry((item) => timeout(Promise.resolve(item)));
    const results = await Promise.all(range.map(worker)); // ?.
    assert.deepStrictEqual(results.sort(), range);
  });
});
