// timeout.spec.ts

import assert from 'assert';

import timeout, { TimeoutError } from './timeout';

describe('timeout', () => {
  it('returns resolved value if promise execution is less than timeout', async () => {
    assert.strictEqual(
      await timeout(
        new Promise((resolve) => {
          setTimeout(() => resolve('abc'), 1);
        }),
        { timeout: 5 }
      ),
      'abc'
    );
  });

  it('returns with reject error if promise execution is less than timeout', async () => {
    await assert.rejects(
      async () =>
        timeout(
          new Promise((_, reject) => {
            reject(new Error('Rejected'));
          }),
          { timeout: 5 }
        ),
      /^Error: Rejected$/u
    );
  });

  it('returns resolved value if promise execution resolves immediately', async () => {
    assert.strictEqual(
      await timeout(
        new Promise((resolve) => {
          resolve('abc');
        }),
        { timeout: 5 }
      ),
      'abc'
    );
  });

  it('rejects with TimeoutError if promise execution exceeds timeout', async () => {
    let reached = false;
    await assert.rejects(
      async () =>
        timeout(
          new Promise(() => {
            setTimeout(() => (reached = true), 10);
          }),
          { timeout: 2 }
        ),
      /^Error: Timeout after 2ms$/u
    );
    assert.strictEqual(reached, false);

    let returnedError;
    try {
      await timeout(
        new Promise(() => {
          setTimeout(() => (reached = true), 10);
        }),
        { timeout: 3 }
      );
    } catch (error: unknown) {
      returnedError = error;
    }
    assert.strictEqual(reached, false);
    assert.ok(returnedError instanceof TimeoutError);
    assert.strictEqual(returnedError.timeout, 3);
  });

  it('throws RangeError on invalid timeout values', async () => {
    const expectedRangeError = /^RangeError: The argument must be >= 1 and <= 900000$/u;
    await assert.rejects(() => timeout(Promise.resolve(), { timeout: -1 }), expectedRangeError);
    await assert.rejects(() => timeout(Promise.resolve(), { timeout: 0 }), expectedRangeError);
    await assert.rejects(() => timeout(Promise.resolve(), { timeout: 900001 }), expectedRangeError);
  });

  it('does not throw RangeError on valid timeout values', async () => {
    await timeout(Promise.resolve());
    await timeout(Promise.resolve(), {});
    await timeout(Promise.resolve(), { timeout: 1 });
    await timeout(Promise.resolve(), { timeout: 900000 });
  });

  it('works in parallel', async () => {
    const range = [...Array(10000).keys()].map((index) => index.toString().padStart(4, '0'));
    const results = await Promise.all(
      range.map(async (index) =>
        timeout(
          new Promise((resolve) => {
            setImmediate(() => resolve(index), 1);
          })
        )
      )
    ); // ?.
    assert.deepStrictEqual(results.sort(), range);
  });
});
