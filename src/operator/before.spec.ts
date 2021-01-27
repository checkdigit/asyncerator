// operator/before.spec.ts

import * as assert from 'assert';

import { all, from } from '../index';

describe('before', () => {
  it('works for an empty array', async () => {
    let completed = false;
    await all([])
      .before(() => {
        completed = true;
      })
      .toArray();
    assert.strictEqual(completed, true);
  });

  it('operates on sequence', async () => {
    let count = 0;
    let beforeCount = 0;
    const results = await all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])
      .forEach(() => {
        count += 1;
      })
      .before(() => {
        beforeCount = count;
      })
      .toArray();
    assert.deepStrictEqual(results.sort(), [1, 2, 3]);
    assert.strictEqual(count, 3);
    assert.strictEqual(beforeCount, 0);
  });

  it('do not reject if before function throws an exception', async () => {
    await from([1])
      .before(() => {
        throw Error('Reject');
      })
      .toArray();
  });
});
