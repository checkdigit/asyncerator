// operator/before.spec.ts

import * as assert from 'assert';

import { all, before, forEach, from, pipeline, toArray } from '../index';

describe('before', () => {
  it('works for an empty array', async () => {
    let completed = false;
    await pipeline(
      all([]),
      before(() => {
        completed = true;
      }),
      toArray
    );
    assert.strictEqual(completed, true);
  });

  it('operates on sequence', async () => {
    let count = 0;
    let beforeCount = 0;
    const results = await pipeline(
      from([3, 4, 5]),
      before(() => 2),
      forEach(() => {
        count += 1;
      }),
      before(() => {
        beforeCount = count;
        return 1;
      }),
      toArray
    );
    assert.deepStrictEqual(results, [1, 2, 3, 4, 5]);
    assert.strictEqual(count, 4);
    assert.strictEqual(beforeCount, 0);
  });

  it('do not reject if before function throws an exception', async () => {
    await pipeline(
      from([1]),
      before(() => {
        throw Error('Reject');
      }),
      toArray
    );
  });
});
