// operator/after.spec.ts

import * as assert from 'assert';

import { after, all, from, pipeline, toArray } from '../index';

describe('after', () => {
  it('works for an empty array', async () => {
    let completed = false;
    const result = await pipeline(
      all([]),
      after(() => {
        completed = true;
      }),
      toArray
    );
    assert.deepStrictEqual(result, []);
    assert.strictEqual(completed, true);
  });

  it('do not reject if after function throws an exception', async () => {
    const result = await pipeline(
      from([1]),
      after(() => {
        // throw Error('Reject');
      }),
      toArray
    );
    assert.deepStrictEqual(result, [1]);
  });
});
