// asyncerator.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'assert';

import { from, pipeline, toArray } from './index';

describe('asyncerator', () => {
  it('from a custom iterator', async () => {
    let count = 0;
    const range: Iterator<number> = {
      next() {
        if (count === 4) {
          return { done: true, value: undefined };
        }
        return { done: false, value: count++ };
      },
    };
    assert.deepStrictEqual(await pipeline(from(range), toArray), [0, 1, 2, 3]);
  });

  it('from a custom iterable', async () => {
    let count = 0;
    // this doesn't have the Symbol.asyncIterator so can't be used with 'for await', but we're cool with it
    const iterator: Iterator<number> = {
      next() {
        if (count === 4) {
          return { done: true, value: undefined };
        }
        return { done: false, value: count++ };
      },
    };
    const iterable: Iterable<number> = {
      [Symbol.iterator]: () => iterator,
    };
    assert.deepStrictEqual(await pipeline(from(iterable), toArray), [0, 1, 2, 3]);
  });

  it('from a custom async iterator', async () => {
    let count = 0;
    // this doesn't have the Symbol.asyncIterator so can't be used with 'for await', but we're cool with it
    const asyncIterator: AsyncIterator<number> = {
      async next() {
        if (count === 4) {
          return { done: true, value: undefined };
        }
        return { done: false, value: count++ };
      },
    };
    assert.deepStrictEqual(await pipeline(from(asyncIterator), toArray), [0, 1, 2, 3]);
  });

  it('from a custom async iterable', async () => {
    let count = 0;
    // this doesn't have the Symbol.asyncIterator so can't be used with 'for await', but we're cool with it
    const asyncIterator: AsyncIterator<number> = {
      async next() {
        if (count === 4) {
          return { done: true, value: undefined };
        }
        return { done: false, value: count++ };
      },
    };
    const asyncIterable: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => asyncIterator,
    };
    assert.deepStrictEqual(await pipeline(from(asyncIterable), toArray), [0, 1, 2, 3]);
  });

  it('a custom async iterable iterator with throw and return defined', async () => {
    let count = 0;
    const asyncIterableIterator: AsyncIterableIterator<number> = {
      [Symbol.asyncIterator]: () => asyncIterableIterator,
      async next() {
        if (count === 4) {
          return { done: true, value: undefined };
        }
        return { done: false, value: count++ };
      },
      async throw() {
        return { done: true, value: 'throw' };
      },
      async return() {
        return { done: true, value: 'return' };
      },
    };
    const asyncerator = from(asyncIterableIterator) as AsyncIterableIterator<number>;
    assert.deepStrictEqual(await pipeline(asyncerator, toArray), [0, 1, 2, 3]);
    if (asyncerator.throw === undefined || asyncerator.return === undefined) {
      throw Error();
    }
    assert.deepStrictEqual(await asyncerator.throw(), { done: true, value: 'throw' });
    assert.deepStrictEqual(await asyncerator.return(), { done: true, value: 'return' });
  });

  it('a custom async iterable iterator without throw and return', async () => {
    let count = 0;
    const asyncIterableIterator: AsyncIterableIterator<number> = {
      [Symbol.asyncIterator]: () => asyncIterableIterator,
      async next() {
        if (count === 4) {
          return { done: true, value: undefined };
        }
        return { done: false, value: count++ };
      },
    };
    const asyncerator = from(asyncIterableIterator) as AsyncIterableIterator<number>;
    assert.deepStrictEqual(await pipeline(asyncerator, toArray), [0, 1, 2, 3]);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    assert.strictEqual(asyncerator.throw, undefined);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    assert.strictEqual(asyncerator.return, undefined);
  });

  it('an async iterable iterator', async () => {
    const iterable = from(from(['abc', Promise.resolve('def'), 'ghi']));
    const items = [];
    for await (const item of iterable) {
      items.push(item);
    }
    assert.deepStrictEqual(items, ['abc', 'def', 'ghi']);
  });

  it('an async generator function', async () => {
    const iterable = from(
      (async function* () {
        yield 'abc';
        yield 'def';
        yield 'ghi';
      })()
    );
    const items = [];
    for await (const item of iterable) {
      items.push(item);
    }
    assert.deepStrictEqual(items, ['abc', 'def', 'ghi']);
  });

  it('reject if array item is a promise that rejects', async () => {
    await assert.rejects(pipeline(from([Promise.reject(new Error('Reject'))]), toArray), /^Error: Reject$/u);
  });
});
