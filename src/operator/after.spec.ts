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
    const results = await from([1, 2, 3])
      .after(() => 4)
      .forEach(() => {
        count += 1;
      })
      .after(() => {
        afterCount = count;
        return 5;
      })
      .toArray();
    assert.deepStrictEqual(results, [1, 2, 3, 4, 5]);
    assert.strictEqual(afterCount, 4);
    assert.strictEqual(count, 4);
  });

  it('do not reject if after function throws an exception', async () => {
    await from([1])
      .after(() => {
        throw Error('Reject');
      })
      .toArray();
  });
});
