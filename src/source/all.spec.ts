// source/all.spec.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { setImmediate } from 'node:timers/promises';

import { all, pipeline, toArray } from '../index.ts';

describe('all', () => {
  it('works for an empty array', async () => {
    assert.deepEqual(await pipeline(all([]), toArray), []);
  });

  it('converts array of promises into async iterable iterator', async () => {
    const iterable = all([
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3),
    ]);
    assert.deepEqual((await pipeline(iterable, toArray)).sort(), [1, 2, 3]);
  });

  it('consumes a generator only once', async () => {
    const promises = (function* () {
      yield Promise.resolve(1);
      yield Promise.resolve(2);
      yield Promise.resolve(3);
    })();
    let iterations = 0;
    promises[Symbol.iterator] = () => {
      // Fail immediately on a second iteration instead of letting the consumer spin.
      assert.equal(iterations++, 0);
      return promises;
    };

    assert.deepEqual(await pipeline(all(promises), toArray), [1, 2, 3]);
    assert.equal(iterations, 1);
  });

  it('preserves repeated promises', async () => {
    const promise = Promise.resolve(1);
    assert.deepEqual(await pipeline(all([promise, promise]), toArray), [1, 1]);
  });

  it('drains values that settle while the consumer is paused', async () => {
    const second = Promise.withResolvers<number>();
    const third = Promise.withResolvers<number>();
    const iterator = all([Promise.resolve(1), second.promise, third.promise])[
      Symbol.asyncIterator
    ]();

    assert.deepEqual(await iterator.next(), { value: 1, done: false });
    third.resolve(3);
    second.resolve(2);
    // Let the completion handlers queue both values before resuming consumption.
    await Promise.resolve();

    assert.deepEqual(await iterator.next(), { value: 3, done: false });
    assert.deepEqual(await iterator.next(), { value: 2, done: false });
    assert.deepEqual(await iterator.next(), { value: undefined, done: true });
  });

  it('emits buffered values without waiting for remaining promises', async () => {
    const second = Promise.withResolvers<number>();
    const third = Promise.withResolvers<number>();
    const iterator = all([Promise.resolve(1), second.promise, third.promise])[
      Symbol.asyncIterator
    ]();

    assert.deepEqual(await iterator.next(), { value: 1, done: false });
    second.resolve(2);
    await Promise.resolve();

    const result = await Promise.race([
      iterator.next(),
      setImmediate('still waiting'),
    ]);
    // Release the final promise even if the consumer incorrectly waited for it.
    third.resolve(3);
    assert.deepEqual(result, { value: 2, done: false });
    assert.deepEqual(await iterator.next(), { value: 3, done: false });
    assert.deepEqual(await iterator.next(), { value: undefined, done: true });
  });

  it('rejects when a remaining promise fails while the consumer is paused', async () => {
    const remaining = Promise.withResolvers<number>();
    const iterator = all([Promise.resolve(1), remaining.promise])[
      Symbol.asyncIterator
    ]();

    assert.deepEqual(await iterator.next(), { value: 1, done: false });
    remaining.reject(new Error('Reject'));
    await assert.rejects(iterator.next(), { message: 'Reject' });
  });

  it('reject if array item is a promise that rejects', async () => {
    await assert.rejects(
      pipeline(all([Promise.reject(new Error('Reject'))]), toArray),
      { message: 'Reject' },
    );
    await assert.rejects(
      pipeline(
        all([
          Promise.resolve(1),
          Promise.reject(new Error('Reject')),
          Promise.resolve(3),
        ]),
        toArray,
      ),
      { message: 'Reject' },
    );
  });
});
