// operator/complete.spec.ts

import * as assert from 'assert';

import { all, from } from '../index';

describe('complete', () => {
  it('works for an empty array', async () => {
    let completed = false;
    await all([])
      .complete(() => {
        completed = true;
      })
      .toArray();
    assert.strictEqual(completed, true);
  });

  it('operates on sequence', async () => {
    let completed = false;
    const results = await all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])
      .complete(() => {
        completed = true;
      })
      .toArray();
    assert.deepStrictEqual(results, [1, 2, 3]);
    assert.strictEqual(completed, true);
  });

  it('do not reject if complete function throws an exception', async () => {
    await from([1])
      .complete(() => {
        throw Error('Reject');
      })
      .toArray();
  });
});
