// source.spec.ts

import * as assert from 'assert';

import { all, Asyncerator, from, merge, series } from './index';

describe('source', () => {
  describe('series', () => {
    it('works for an empty array', async () => {
      assert.deepStrictEqual(await series(from([])).toArray(), []);
    });

    it('works for a sequence of non-promises', async () => {
      assert.deepStrictEqual(await series(from([1, 2]), from([3]), from([4, 5])).toArray(), [1, 2, 3, 4, 5]);
    });

    it('works for a mixed sequence of promises and non-promises', async () => {
      assert.deepStrictEqual(await series(from([1, Promise.resolve(2)]), from([3])).toArray(), [1, 2, 3]);
    });

    it('reject if array item is a promise that rejects', async () => {
      await assert.rejects(series(from([Promise.reject(new Error('Reject'))])).toArray(), /^Error: Reject$/u);
    });
  });

  describe('all', () => {
    it('works for an empty array', async () => {
      assert.deepStrictEqual(await all([]).toArray(), []);
    });

    it('converts array of promises into async iterable iterator', async () => {
      const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
      assert.deepStrictEqual(await iterable.toArray(), [1, 2, 3]);
    });

    it('reject if array item is a promise that rejects', async () => {
      await assert.rejects(all([Promise.reject(new Error('Reject'))]).toArray(), /^Error: Reject$/u);
      await assert.rejects(
        all([Promise.resolve(1), Promise.reject(new Error('Reject')), Promise.resolve(3)]).toArray(),
        /^Error: Reject$/u
      );
    });
  });

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
      // eslint-disable-next-line func-names
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

  describe('merge', () => {
    it('allows empty array of async iterable iterators', async () => {
      assert.deepStrictEqual(await merge().next(), {
        done: true,
        value: undefined,
      });
    });

    it('works with a single non-promise value', async () => {
      const iterator = merge(from(['1']));
      assert.deepStrictEqual(
        [await iterator.next(), await iterator.next()],
        [
          { value: '1', done: false },
          { value: undefined, done: true },
        ]
      );
    });

    it('works with a recursive sources', async () => {
      assert.deepStrictEqual(await merge(from(['1', from(['2'])])).toArray(), ['1', '2']);
      assert.deepStrictEqual(await merge(from([from(['1'])])).toArray(), ['1']);
      assert.deepStrictEqual((await merge(from(['1', from(['2', merge(from(['3'])), '4']), '5'])).toArray()).sort(), [
        '1',
        '2',
        '3',
        '4',
        '5',
      ]);
    });

    it('reject if array item is a promise that rejects', async () => {
      await assert.rejects(merge(from([Promise.reject(new Error('Reject')), '1'])).toArray(), /^Error: Reject$/u);
      await assert.rejects(
        merge(from([from(['1', Promise.reject(new Error('Reject'))]), '2'])).toArray(),
        /^Error: Reject$/u
      );
    });

    it('works with a multiple identical sources', async () => {
      const source = from(['1']);
      const iterator = merge(source, source, source);
      assert.deepStrictEqual(
        [await iterator.next(), await iterator.next()],
        [
          { value: '1', done: false },
          { value: undefined, done: true },
        ]
      );
    });

    it('works with for await', async () => {
      const iterator = merge(from([Promise.resolve('abc'), Promise.resolve('def')]));
      const results = [];
      for await (const result of iterator) {
        results.push(result);
      }
      assert.deepStrictEqual(results, ['abc', 'def']);
    });

    it('works with a single promisified value', async () => {
      const iterator = merge(from([Promise.resolve('abc')]));
      assert.deepStrictEqual(
        [await iterator.next(), await iterator.next()],
        [
          { value: 'abc', done: false },
          { value: undefined, done: true },
        ]
      );
    });

    it('works with a single promisified value that rejects', async () => {
      const iterator = merge(from([Promise.reject(new Error('Reject'))]));
      await assert.rejects(iterator.next(), /^Error: Reject$/u);
    });

    it('works with a custom async iterable', async () => {
      let count = 0;
      // this doesn't have the Symbol.asyncIterator so can't be used with 'for await', but we're cool with it
      const range: AsyncIterator<number> = {
        async next() {
          if (count === 4) {
            return { done: true, value: undefined };
          }
          return { done: false, value: count++ };
        },
      };
      assert.deepStrictEqual(await merge(range).toArray(), [0, 1, 2, 3]);
    });

    it('works with a bunch of crazy stuff', async () => {
      assert.deepStrictEqual(
        (
          await merge(
            from(['10']),
            from([new Promise((resolve) => resolve('77'))]),
            from(['30']),
            from(['11', '12', new Promise((resolve) => resolve('58')), '14']),
            from(['41'])
          ).toArray()
        ).sort(),
        ['10', '11', '12', '14', '30', '41', '58', '77']
      );
    });

    it('works with a randomized merge tree', async () => {
      const TEST_SIZE = 3178;
      const input = [...Array(TEST_SIZE)].map(() => Math.ceil(Math.random() * 25));

      function tree(elements: number[]): Asyncerator<number> {
        if (elements.length === 0) {
          return from([]);
        }
        if (elements.length === 1) {
          return from<number>(([
            new Promise<number>((resolve) => setTimeout(() => resolve(elements[0]), elements[0])),
          ] as unknown) as Asyncerator<number>);
        }
        const splitInto = elements[0];
        const chunkSize = Math.ceil((elements.length - 1) / splitInto);
        const mergeables: Array<Asyncerator<number>> = [];
        for (let chunk = 0; chunk <= splitInto; chunk++) {
          mergeables.push(tree(elements.slice(chunk * chunkSize, (chunk + 1) * chunkSize)));
        }
        return merge(...mergeables);
      }

      const result = await tree(input).toArray();
      assert.deepStrictEqual(input.sort(), result.sort());
    });
  });
});
