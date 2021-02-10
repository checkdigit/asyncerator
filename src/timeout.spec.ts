// timeout.spec.ts

import assert from 'assert';

import timeout from './timeout';

describe('timeout', () => {
  it('returns resolved value if promise execution is less than timeout', async () => {
    assert.strictEqual(
      await timeout(5)(
        new Promise((resolve) => {
          setTimeout(() => resolve('abc'), 1);
        })
      ),
      'abc'
    );
  });

  it('returns with reject error if promise execution is less than timeout', async () => {
    await assert.rejects(
      async () =>
        timeout(5)(
          new Promise((_, reject) => {
            reject(new Error('Rejected'));
          })
        ),
      /^Error: Rejected$/u
    );
  });

  it('returns resolved value if promise execution resolves immediately', async () => {
    assert.strictEqual(
      await timeout(5)(
        new Promise((resolve) => {
          resolve('abc');
        })
      ),
      'abc'
    );
  });

  it('rejects with Timeout error if promise execution exceeds timeout', async () => {
    let reached = false;
    await assert.rejects(
      async () =>
        timeout(2)(
          new Promise(() => {
            setTimeout(() => (reached = true), 10);
          })
        ),
      /^Error: Timeout after 2ms$/u
    );
    assert.strictEqual(reached, false);
    await assert.rejects(
      async () =>
        timeout(3)(
          new Promise(() => {
            setTimeout(() => (reached = true), 10);
          })
        ),
      /^Error: Timeout after 3ms$/u
    );
    assert.strictEqual(reached, false);
  });

  it('throws RangeError on invalid timeout values', async () => {
    const expectedRangeError = /^RangeError: The argument must be >= 1 and <= 900000$/u;
    assert.throws(() => timeout(-1), expectedRangeError);
    assert.throws(() => timeout(0), expectedRangeError);
    assert.throws(() => timeout(900001), expectedRangeError);
  });

  it('does not throw RangeError on valid timeout values', async () => {
    timeout();
    timeout(1);
    timeout(900000);
  });
});
