// operator/on-error.spec.ts

import * as assert from 'assert';

import { after, all, from, onError, pipeline, toArray } from '../index';

describe('onError', () => {
  it('works for an empty array', async () => {
    let errored = false;
    await pipeline(
      all([]),
      onError(() => {
        errored = true;
      }),
      toArray
    );
    assert.strictEqual(errored, false);
  });

  it('operates on sequence', async () => {
    let errored = false;
    const results = await pipeline(
      all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]),
      onError(() => {
        errored = true;
      }),
      toArray
    );
    assert.deepStrictEqual(results.sort(), [1, 2, 3]);
    assert.strictEqual(errored, false);
  });

  it('do not reject if error function throws an exception', async () => {
    let completed = false;
    let errored = false;
    await pipeline(
      from([Promise.reject(new Error('Reject'))]),
      after(() => {
        completed = true;
      }),
      onError(() => {
        errored = true;
        throw Error('Reject');
      }),
      toArray
    );
    assert.strictEqual(completed, false);
    assert.strictEqual(errored, true);
  });

  it('called if array item is a promise that rejects', async () => {
    let completed = false;
    let errorObject: Error = new Error();
    await pipeline(
      from([Promise.reject(new Error('Reject'))]),
      after(() => {
        completed = true;
      }),
      onError((error) => {
        errorObject = error;
      }),
      toArray
    );
    assert.strictEqual(completed, false);
    assert.strictEqual(errorObject.message, 'Reject');
  });
});
