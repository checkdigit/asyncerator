// source/from.spec.ts

import * as assert from 'assert';

import { from } from '../index';

describe('from', () => {
  it('a custom iterator', async () => {
    let count = 0;
    const range: Iterator<number> = {
      next() {
        if (count === 4) {
          return { done: true, value: undefined };
        }
        return { done: false, value: count++ };
      },
    };
    assert.deepStrictEqual(await from(range).toArray(), [0, 1, 2, 3]);
  });

  it('a custom iterable', async () => {
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
      [Symbol.iterator]: () => {
        return iterator;
      },
    };
    assert.deepStrictEqual(await from(iterable).toArray(), [0, 1, 2, 3]);
  });

  it('a custom async iterator', async () => {
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
    assert.deepStrictEqual(await from(asyncIterator).toArray(), [0, 1, 2, 3]);
  });

  it('a custom async iterable', async () => {
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
      [Symbol.asyncIterator]: () => {
        return asyncIterator;
      },
    };
    assert.deepStrictEqual(await from(asyncIterable).toArray(), [0, 1, 2, 3]);
  });

  it('a custom async iterable iterator with throw and return defined', async () => {
    let count = 0;
    const asyncIterableIterator: AsyncIterableIterator<number> = {
      [Symbol.asyncIterator]: () => {
        return asyncIterableIterator;
      },
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
    const asyncerator = from(asyncIterableIterator);
    assert.deepStrictEqual(await asyncerator.toArray(), [0, 1, 2, 3]);
    if (asyncerator.throw === undefined || asyncerator.return === undefined) {
      throw Error();
    }
    assert.deepStrictEqual(await asyncerator.throw(), { done: true, value: 'throw' });
    assert.deepStrictEqual(await asyncerator.return(), { done: true, value: 'return' });
  });

  it('a custom async iterable iterator without throw and return', async () => {
    let count = 0;
    const asyncIterableIterator: AsyncIterableIterator<number> = {
      [Symbol.asyncIterator]: () => {
        return asyncIterableIterator;
      },
      async next() {
        if (count === 4) {
          return { done: true, value: undefined };
        }
        return { done: false, value: count++ };
      },
    };
    const asyncerator = from(asyncIterableIterator);
    assert.deepStrictEqual(await asyncerator.toArray(), [0, 1, 2, 3]);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    assert.strictEqual(asyncerator.throw, undefined);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    assert.strictEqual(asyncerator.return, undefined);
  });

  it('an async iterable iterator', async () => {
    const iterable: AsyncIterableIterator<string | Promise<string>> = from(
      from(['abc', Promise.resolve('def'), 'ghi'])
    );
    const items = [];
    for await (const item of iterable) {
      items.push(item);
    }
    assert.deepStrictEqual(items, ['abc', 'def', 'ghi']);
  });

  it('an async generator function', async () => {
    const iterable: AsyncIterableIterator<string | Promise<string>> = from(async function* () {
      yield 'abc';
      yield 'def';
      yield 'ghi';
    });
    const items = [];
    for await (const item of iterable) {
      items.push(item);
    }
    assert.deepStrictEqual(items, ['abc', 'def', 'ghi']);
  });

  it('reject if array item is a promise that rejects', async () => {
    await assert.rejects(from([Promise.reject(new Error('Reject'))]).next(), /^Error: Reject$/u);
  });
});
