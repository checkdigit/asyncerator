// operator/before.spec.ts

import * as assert from 'assert';

import { all, before, from, pipeline, toArray } from '../index';

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
