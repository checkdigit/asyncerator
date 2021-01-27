// operator/after.spec.ts

import * as assert from 'assert';

import { all, from } from '../index';

describe('after', () => {
  it('works for an empty array', async () => {
    let completed = false;
    await all([])
      .after(() => {
        completed = true;
      })
      .toArray();
    assert.strictEqual(completed, true);
  });

  it('operates on sequence', async () => {
    let count = 0;
    let afterCount = 0;
    const results = await all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])
      .forEach(() => {
        count += 1;
      })
      .after(() => {
        afterCount = count;
      })
      .toArray();
    assert.deepStrictEqual(results.sort(), [1, 2, 3]);
    assert.strictEqual(afterCount, 3);
    assert.strictEqual(count, 3);
  });

  it('do not reject if after function throws an exception', async () => {
    await from([1])
      .after(() => {
        throw Error('Reject');
      })
      .toArray();
  });
});
