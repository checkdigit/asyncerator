// source/merge.spec.ts

import * as assert from 'assert';

import { Asyncerator, from, merge } from '../index';

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
          from([
            new Promise((resolve) => {
              resolve('77');
            }),
          ]),
          from(['30']),
          from([
            '11',
            '12',
            new Promise((resolve) => {
              resolve('58');
            }),
            '14',
          ]),
          from(['41'])
        ).toArray()
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
        return from<number>(([
          new Promise<number>((resolve) => {
            setTimeout(() => resolve(elements[0]), elements[0]);
          }),
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