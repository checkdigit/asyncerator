// asyncerator.spec.ts

import * as assert from 'assert';

import { all, Asyncerator, from, merge, series } from './asyncerator';

describe('asyncerator', () => {
  describe('map', () => {
    it('works for an empty array', async () => {
      assert.deepStrictEqual(
        await all([])
          .map(() => {
            throw new Error('This should not happen');
          })
          .toArray(),
        []
      );
    });

    it('operates on sequence of promises', async () => {
      const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
      assert.deepStrictEqual(await iterable.map((value) => value * 2).toArray(), [2, 4, 6]);
    });

    it('operates on sequence of non-promises', async () => {
      const iterable = from(['a', 'bb', 'ccc']);
      assert.deepStrictEqual(await iterable.map((value) => value.length).toArray(), [1, 2, 3]);
    });

    it('is chain-able', async () => {
      const iterable = from(['a', 'bb', 'ccc']);
      assert.deepStrictEqual(
        await iterable
          .map((value) => value.length)
          .map((value) => value * 2)
          .map((value) => ''.padStart(value, ' '))
          .toArray(),
        ['  ', '    ', '      ']
      );
    });

    it('reject if map function throws an exception', async () => {
      await assert.rejects(
        from([1])
          .map(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
      await assert.rejects(
        all([Promise.resolve(1)])
          .map(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
    });
  });

  describe('forEach', () => {
    it('works for an empty array', async () => {
      const results: unknown[] = [];
      await all([])
        .forEach((item) => results.push(item))
        .toArray();
      assert.deepStrictEqual(results, []);
    });

    it('operates on sequence of promises', async () => {
      const results: number[] = [];
      const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
      await iterable.forEach((value) => results.push(value)).toArray();
      assert.deepStrictEqual(results, [1, 2, 3]);
    });

    it('operates on sequence of non-promises', async () => {
      const results: string[] = [];
      const iterable = from(['a', 'bb', 'ccc']);
      await iterable.forEach((value) => results.push(value)).toArray();
      assert.deepStrictEqual(results, ['a', 'bb', 'ccc']);
    });

    it('is chain-able', async () => {
      const results: string[] = [];
      const iterable = from(['a', 'bb', 'ccc']);
      await iterable
        .map((value) => value.length)
        .map((value) => value * 2)
        .map((value) => ''.padStart(value, ' '))
        .forEach((value) => results.push(value))
        .toArray();
      assert.deepStrictEqual(results, ['  ', '    ', '      ']);
    });

    it('reject if forEach function throws an exception', async () => {
      await assert.rejects(
        from([1])
          .forEach(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
      await assert.rejects(
        all([Promise.resolve(1)])
          .forEach(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
    });
  });

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

  describe('error', () => {
    it('works for an empty array', async () => {
      let errored = false;
      await all([])
        .error(() => {
          errored = true;
        })
        .toArray();
      assert.strictEqual(errored, false);
    });

    it('operates on sequence', async () => {
      let errored = false;
      const results = await all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])
        .error(() => {
          errored = true;
        })
        .toArray();
      assert.deepStrictEqual(results, [1, 2, 3]);
      assert.strictEqual(errored, false);
    });

    it('do not reject if error function throws an exception', async () => {
      let completed = false;
      let errored = false;
      await from([Promise.reject(new Error('Reject'))])
        .complete(() => {
          completed = true;
        })
        .error(() => {
          errored = true;
          throw Error('Reject');
        })
        .toArray();
      assert.strictEqual(completed, false);
      assert.strictEqual(errored, true);
    });

    it('called if array item is a promise that rejects', async () => {
      let completed = false;
      let errorObject: Error = new Error();
      await from([Promise.reject(new Error('Reject'))])
        .complete(() => {
          completed = true;
        })
        .error((error) => {
          errorObject = error;
        })
        .toArray();
      assert.strictEqual(completed, false);
      assert.strictEqual(errorObject.message, 'Reject');
    });
  });

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

    it('a async iterable iterator', async () => {
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

  describe('toArray', () => {
    it('converts an async iterable iterator into an array', async () => {
      assert.deepStrictEqual(await from(['abc', Promise.resolve('def')]).toArray(), ['abc', 'def']);
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

  describe('split', () => {
    it('works with simple string values', async () => {
      assert.deepStrictEqual(await from(['a\nb\nc', 'd', 'e']).split('\n').toArray(), ['a', 'b', 'cde']);

      assert.deepStrictEqual(await from(['a\nb', '\nc', '\nd']).split('\n').toArray(), ['a', 'b', 'c', 'd']);
    });

    it('compatible with native split implementation', async () => {
      async function check(value: string | string[], separator: string, limit?: number) {
        if (typeof value === 'string') {
          assert.deepStrictEqual(await from([value]).split(separator, limit).toArray(), value.split(separator, limit));
        } else {
          assert.deepStrictEqual(
            await from(value).split(separator, limit).toArray(),
            value.join('').split(separator, limit)
          );
        }
      }
      await check(['X', ''], '');
      await check('X', '');
      await check('X', 'X');
      await check(['', '', ''], '');
      await check('X', 'Y');
      await check(['This is\na buffer than', ' needs to be split\ninto multiple lines\n'], '', 30);
      await check('This is\na buffer than needs to be split\ninto multiple lines\n', '');
      await check('This is\na buffer than needs to be split\ninto multiple lines\n', '', 15);
      await check('This is\na buffer than needs to be split\ninto multiple lines\n', 'X');
      await check('This is\na buffer than needs to be split\ninto multiple lines\n', '\n', 25);
    });

    it('supports limit', async () => {
      assert.deepStrictEqual(await from(['a\nb\nc', 'd', 'e']).split('\n', 0).toArray(), []);
      assert.deepStrictEqual(await from([]).split('\n', 1).toArray(), []);
      assert.deepStrictEqual(await from(['a\nb\nc', 'd', 'e']).split('\n', 2).toArray(), ['a', 'b']);
      assert.deepStrictEqual(await from(['a\nb', '\nc', '\nd']).split('\n', 3).toArray(), ['a', 'b', 'c']);
      assert.deepStrictEqual(await from(['a\nb', '\nc', '\nd']).split('\n', 4).toArray(), ['a', 'b', 'c', 'd']);
      assert.deepStrictEqual(await from(['a\nb', '\nc', '\nd']).split('\n', 5).toArray(), ['a', 'b', 'c', 'd']);
    });

    it('works with a stream of buffers', async () => {
      const buffer1 = Buffer.from('This is\na ');
      const buffer2 = Buffer.from('buffer that ');
      const buffer3 = Buffer.from('needs to be');
      const buffer4 = Buffer.from(' split\ninto multiple lines\n');
      const iterable = from([buffer1, buffer2, buffer3, buffer4]);
      const results = await iterable.split('\n').toArray();
      assert.deepStrictEqual(results, ['This is', 'a buffer that needs to be split', 'into multiple lines', '']);
    });

    it('reject if item is not convertible to string', async () => {
      await assert.rejects(from([null]).split('\n').next(), /^Error: null not convertible to a string$/u);
      await assert.rejects(from([undefined]).split('\n').next(), /^Error: undefined not convertible to a string$/u);
      await assert.rejects(
        from([Object.create(null)])
          .split('\n')
          .next(),
        /^Error: \{\} not convertible to a string$/u
      );
    });
  });

  describe('filter', () => {
    it('works for an empty array', async () => {
      assert.deepStrictEqual(
        await all([])
          .filter(() => {
            throw new Error('This should not happen');
          })
          .toArray(),
        []
      );
    });

    it('operates on sequence of promises', async () => {
      const iterable = all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
      assert.deepStrictEqual(await iterable.filter((value) => value !== 2).toArray(), [1, 3]);
    });

    it('operates on sequence of non-promises', async () => {
      const iterable = from(['a', 'bb', 'ccc']);
      assert.deepStrictEqual(await iterable.filter(() => true).toArray(), ['a', 'bb', 'ccc']);
    });

    it('is chain-able', async () => {
      const iterable = from(['a', 'bb', 'ccc']);
      assert.deepStrictEqual(
        await iterable
          .filter((value) => value !== 'a')
          .filter((value) => value !== 'ccc')
          .toArray(),
        ['bb']
      );
    });

    it('reject if filter function throws an exception', async () => {
      await assert.rejects(
        from([1])
          .filter(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
      await assert.rejects(
        all([Promise.resolve(1)])
          .filter(() => {
            throw Error('Reject');
          })
          .toArray(),
        /^Error: Reject$/u
      );
    });
  });
});
