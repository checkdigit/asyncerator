// source/merge.spec.ts

/*
 * Copyright (c) 2021-2022 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import * as assert from 'node:assert';

import { Asyncerator, from, merge, pipeline, toArray } from '../index';

async function* passThru<T>(iterable: AsyncIterable<T>): AsyncGenerator<T> {
  for await (const thing of iterable) {
    yield thing;
  }
}
describe('merge', () => {
  it('allows empty array of async iterable iterators', async () => {
    assert.deepStrictEqual(await merge()[Symbol.asyncIterator]().next(), {
      done: true,
      value: undefined,
    });
  });

  it('works with a single non-promise value', async () => {
    const iterator = merge(['1'])[Symbol.asyncIterator]();
    assert.deepStrictEqual(
      [await iterator.next(), await iterator.next()],
      [
        { value: '1', done: false },
        { value: undefined, done: true },
      ]
    );
  });

  it('works with a recursive sources', async () => {
    assert.deepStrictEqual(await pipeline(merge(['1', ['2']]), toArray), ['1', ['2']]);
    assert.deepStrictEqual(await pipeline(merge(from(['1', from(['2'])])), toArray), ['1', '2']);
    assert.deepStrictEqual(await pipeline(merge(from([from(['1'])])), toArray), ['1']);
    assert.deepStrictEqual(
      (await pipeline(merge(from(['1', from(['2', merge(from(['3'])), '4']), '5'])), toArray)).sort(),
      ['1', '2', '3', '4', '5']
    );
  });

  it('reject if array item is a promise that rejects', async () => {
    await assert.rejects(pipeline(merge(['0', Promise.reject(new Error('Reject')), '1']), toArray), /^Error: Reject$/u);
    await assert.rejects(
      pipeline(merge(from([from(['1', Promise.reject(new Error('Reject'))]), '2'])), toArray),
      /^Error: Reject$/u
    );
  });

  it('works with a multiple identical sources', async () => {
    const source = from(['1']);
    const iterator = merge(source, source, source)[Symbol.asyncIterator]();
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
    const iterator = merge(from([Promise.resolve('abc')]))[Symbol.asyncIterator]();
    assert.deepStrictEqual(
      [await iterator.next(), await iterator.next()],
      [
        { value: 'abc', done: false },
        { value: undefined, done: true },
      ]
    );
  });

  it('works with a single promisified value that rejects', async () => {
    const iterator = merge(from([Promise.reject(new Error('Reject'))]))[Symbol.asyncIterator]();
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
    assert.deepStrictEqual(await pipeline(merge(range), toArray), [0, 1, 2, 3]);
  });

  it('works with a bunch of crazy stuff', async () => {
    assert.deepStrictEqual(
      (
        await pipeline(
          merge(
            ['10'],
            from([
              new Promise((resolve) => {
                resolve('77');
              }),
            ]),
            pipeline(['30'], passThru),
            from([
              '11',
              '12',
              new Promise((resolve) => {
                resolve('58');
              }),
              '14',
            ]),
            from(['41'])
          ),
          toArray
        )
      ).sort(),
      ['10', '11', '12', '14', '30', '41', '58', '77']
    );
  });

  it('works with a randomized merge tree', async () => {
    const TEST_SIZE = 1037;
    const input = [...Array(TEST_SIZE)].map(() => Math.ceil(Math.random() * 25));

    function tree(elements: number[]): Asyncerator<number> {
      if (elements.length === 0) {
        return from([]);
      }
      if (elements.length === 1) {
        return from<number>([
          new Promise<number>((resolve) => {
            setTimeout(() => resolve(elements[0] as number), elements[0]);
          }),
        ] as unknown as Asyncerator<number>);
      }
      const splitInto = elements[0] as number;
      const chunkSize = Math.ceil((elements.length - 1) / splitInto);
      const mergeables: Array<Asyncerator<number>> = [];
      for (let chunk = 0; chunk <= splitInto; chunk++) {
        mergeables.push(tree(elements.slice(chunk * chunkSize, (chunk + 1) * chunkSize)));
      }
      return merge(...mergeables);
    }

    const result = await pipeline(tree(input), toArray);
    assert.deepStrictEqual(input.sort(), result.sort());
  });
});
