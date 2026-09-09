// source/merge.spec.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { type Asyncerator, from, merge, pipeline, toArray } from '../index.ts';

async function* passThru<T>(iterable: AsyncIterable<T>): AsyncGenerator<T> {
  for await (const thing of iterable) {
    yield thing;
  }
}

function repeatingSource<T>(
  value: T,
  onReturn: () => void | Promise<void>,
): AsyncIterableIterator<T> {
  const iterator: AsyncIterableIterator<T> = {
    [Symbol.asyncIterator]: () => iterator,
    async next() {
      return { done: false, value };
    },
    async return() {
      await onReturn();
      return { done: true, value: undefined };
    },
  };
  return iterator;
}

describe('merge', () => {
  it('allows empty array of async iterable iterators', async () => {
    assert.deepEqual(await merge()[Symbol.asyncIterator]().next(), {
      done: true,
      value: undefined,
    });
  });

  it('works with a single non-promise value', async () => {
    const iterator = merge(['1'])[Symbol.asyncIterator]();
    assert.deepEqual(
      [await iterator.next(), await iterator.next()],
      [
        { value: '1', done: false },
        { value: undefined, done: true },
      ],
    );
  });

  it('preserves null and undefined values', async () => {
    const values = [null, undefined, 'value', null, undefined];
    assert.deepEqual(await Array.fromAsync(merge(values)), values);
  });

  it('works with a recursive sources', async () => {
    assert.deepEqual(await pipeline(merge(['1', ['2']]), toArray), [
      '1',
      ['2'],
    ]);
    assert.deepEqual(await pipeline(merge(from(['1', from(['2'])])), toArray), [
      '1',
      '2',
    ]);
    assert.deepEqual(await pipeline(merge(from([from(['1'])])), toArray), [
      '1',
    ]);
    const recursiveSource = merge(
      from(['1', from(['2', merge(from(['3'])), '4']), '5']),
    );
    const result = await pipeline(recursiveSource, toArray);
    assert.deepEqual(result.sort(), ['1', '2', '3', '4', '5']);
  });

  it('work if an array item is a promise', async () => {
    assert.deepEqual(
      await pipeline(merge(['0', Promise.resolve('2'), '1']), toArray),
      ['0', '2', '1'],
    );
  });

  it('reject if array item is a promise that rejects', async () => {
    await assert.rejects(
      pipeline(merge(['0', Promise.reject(new Error('Reject')), '1']), toArray),
      {
        message: 'Reject',
      },
    );
    const recursiveSource = merge(
      from([from(['1', Promise.reject(new Error('Reject'))]), '2']),
    );
    await assert.rejects(pipeline(recursiveSource, toArray), {
      message: 'Reject',
    });
  });

  it('works with a multiple identical sources', async () => {
    const source = from(['1']);
    const iterator = merge(source, source, source)[Symbol.asyncIterator]();
    assert.deepEqual(
      [await iterator.next(), await iterator.next()],
      [
        { value: '1', done: false },
        { value: undefined, done: true },
      ],
    );
  });

  it('works with for await', async () => {
    const iterator = merge(
      from([Promise.resolve('abc'), Promise.resolve('def')]),
    );
    const results = [];
    // Test the for-await interface explicitly.
    for await (const result of iterator) {
      results.push(result);
    }
    assert.deepEqual(results, ['abc', 'def']);
  });

  it('works with a single promisified value', async () => {
    const iterator = merge(from([Promise.resolve('abc')]))[
      Symbol.asyncIterator
    ]();
    assert.deepEqual(
      [await iterator.next(), await iterator.next()],
      [
        { value: 'abc', done: false },
        { value: undefined, done: true },
      ],
    );
  });

  it('works with a single promisified value that rejects', async () => {
    const iterator = merge(from([Promise.reject(new Error('Reject'))]))[
      Symbol.asyncIterator
    ]();
    await assert.rejects(iterator.next(), { message: 'Reject' });
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
    assert.deepEqual(await pipeline(merge(range), toArray), [0, 1, 2, 3]);
  });

  it('closes all active sources, including nested sources, on early break', async () => {
    const closed: string[] = [];
    const nested = repeatingSource('nested', () => {
      closed.push('nested');
    });
    const parent = repeatingSource(nested, () => {
      closed.push('parent');
    });
    const sibling = repeatingSource('sibling', () => {
      closed.push('sibling');
    });

    // breaking iteration must close every active source.
    // eslint-disable-next-line no-unreachable-loop
    for await (const value of merge<string>(parent, sibling)) {
      assert.ok(value === 'nested' || value === 'sibling');
      break;
    }

    assert.deepEqual(closed.sort(), ['nested', 'parent', 'sibling']);
  });

  it('waits for asynchronous cleanup before returning', async () => {
    const cleanupStarted = Promise.withResolvers<undefined>();
    const allowCleanup = Promise.withResolvers<undefined>();
    let hasClosed = false;
    const source = repeatingSource('value', async () => {
      cleanupStarted.resolve(undefined);
      await allowCleanup.promise;
      hasClosed = true;
    });
    const iterator = merge(source)[Symbol.asyncIterator]();
    assert.deepEqual(await iterator.next(), { done: false, value: 'value' });
    assert.ok(iterator.return);
    const returnIterator = iterator.return.bind(iterator);
    let hasReturned = false;
    const returning = (async () => {
      const result = await returnIterator();
      hasReturned = true;
      return result;
    })();

    await Promise.race([cleanupStarted.promise, returning]);
    assert.equal(hasReturned, false);
    assert.equal(hasClosed, false);
    allowCleanup.resolve(undefined);
    assert.deepEqual(await returning, { done: true, value: undefined });
    assert.equal(hasClosed, true);
  });

  it('closes sibling sources when a source rejects', async () => {
    const error = new Error('source failed');
    let hasClosed = false;
    const sibling = repeatingSource('sibling', () => {
      hasClosed = true;
    });
    const failingSource = from([Promise.reject(error)]);

    await assert.rejects(
      Array.fromAsync(merge(failingSource, sibling)),
      (caught: unknown) => caught === error,
    );
    assert.equal(hasClosed, true);
  });

  it('preserves the source error and closes siblings when cleanup rejects', async () => {
    const error = new Error('source failed');
    let hasClosed = false;
    const cleanupFailure = repeatingSource('cleanup failure', () => {
      throw new Error('cleanup failed');
    });
    const sibling = repeatingSource('sibling', () => {
      hasClosed = true;
    });
    const failingSource = from([Promise.reject(error)]);

    await assert.rejects(
      Array.fromAsync(merge(failingSource, cleanupFailure, sibling)),
      (caught: unknown) => caught === error,
    );
    assert.equal(hasClosed, true);
  });

  it('rejects with the cleanup error after closing sibling sources', async () => {
    const error = new Error('cleanup failed');
    let hasClosed = false;
    const cleanupFailure = repeatingSource('value', () => {
      throw error;
    });
    const sibling = repeatingSource('sibling', () => {
      hasClosed = true;
    });
    const iterator = merge(cleanupFailure, sibling)[Symbol.asyncIterator]();
    assert.deepEqual(await iterator.next(), { done: false, value: 'value' });
    assert.ok(iterator.return);

    await assert.rejects(
      iterator.return(),
      (caught: unknown) => caught === error,
    );
    assert.equal(hasClosed, true);
  });

  it('closes an acquired source when a later source fails to initialize', async () => {
    const error = new Error('initialization failed');
    let returnCount = 0;
    let nextCount = 0;
    const acquired: Iterable<string> = {
      [Symbol.iterator]() {
        return {
          next() {
            nextCount += 1;
            return { done: false, value: 'value' };
          },
          return() {
            returnCount += 1;
            return { done: true, value: undefined };
          },
        };
      },
    };
    const failingSource: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        throw error;
      },
    };
    const iterator = merge(acquired, failingSource)[Symbol.asyncIterator]();

    await assert.rejects(
      iterator.next(),
      (caught: unknown) => caught === error,
    );
    assert.equal(nextCount, 0);
    assert.equal(returnCount, 1);
  });

  it('closes a bare iterator while its next result is pending', async () => {
    const nextResult = Promise.withResolvers<IteratorResult<string>>();
    const cleanupStarted = Promise.withResolvers<undefined>();
    let hasClosed = false;
    const source: AsyncIterator<string> = {
      async next() {
        return nextResult.promise;
      },
      async return() {
        hasClosed = true;
        cleanupStarted.resolve(undefined);
        nextResult.resolve({ done: true, value: undefined });
        return { done: true, value: undefined };
      },
    };
    const iterator = merge(['first'], source)[Symbol.asyncIterator]();
    assert.deepEqual(await iterator.next(), { done: false, value: 'first' });
    assert.ok(iterator.return);
    const returning = iterator.return();
    await Promise.race([
      cleanupStarted.promise,
      new Promise<void>((resolve) => {
        setImmediate(resolve);
      }),
    ]);

    const wasClosedWhilePending = hasClosed;
    nextResult.resolve({ done: true, value: undefined });
    assert.deepEqual(await returning, { done: true, value: undefined });
    assert.equal(wasClosedWhilePending, true);
  });

  it('closes duplicate iterator sources only once', async () => {
    let returnCount = 0;
    const source = repeatingSource('value', () => {
      returnCount += 1;
    });
    const iterator = merge(source, source, source)[Symbol.asyncIterator]();
    assert.deepEqual(await iterator.next(), { done: false, value: 'value' });
    assert.ok(iterator.return);
    await iterator.return();
    assert.equal(returnCount, 1);
  });

  it('closes duplicate bare async iterator sources only once', async () => {
    let returnCount = 0;
    const source: AsyncIterator<string> = {
      async next() {
        return { done: false, value: 'value' };
      },
      async return() {
        returnCount += 1;
        return { done: true, value: undefined };
      },
    };
    const iterator = merge(source, source, source)[Symbol.asyncIterator]();
    assert.deepEqual(await iterator.next(), { done: false, value: 'value' });
    assert.ok(iterator.return);
    await iterator.return();
    assert.equal(returnCount, 1);
  });

  it('closes duplicate synchronous iterator sources only once', async () => {
    let returnCount = 0;
    const source: IterableIterator<string> = {
      [Symbol.iterator]: () => source,
      next() {
        return { done: false, value: 'value' };
      },
      return() {
        returnCount += 1;
        return { done: true, value: undefined };
      },
    };
    const iterator = merge(source, source, source)[Symbol.asyncIterator]();
    assert.deepEqual(await iterator.next(), { done: false, value: 'value' });
    assert.ok(iterator.return);
    await iterator.return();
    assert.equal(returnCount, 1);
  });

  // Exercise receiver binding for iterator protocol methods on plain iterable objects.
  /* eslint-disable unicorn/no-this-outside-of-class */
  it('closes duplicate async iterable facades sharing a bare iterator only once', async () => {
    let returnCount = 0;
    const source: AsyncIterator<string> = {
      async next() {
        return { done: false, value: 'value' };
      },
      async return() {
        assert.equal(this, source);
        returnCount += 1;
        return { done: true, value: undefined };
      },
    };
    const facade = {
      iterator: source,
      acquisitions: 0,
      [Symbol.asyncIterator]() {
        this.acquisitions += 1;
        return this.iterator;
      },
    };
    const iterator = merge(facade, facade, facade)[Symbol.asyncIterator]();

    assert.deepEqual(await iterator.next(), { done: false, value: 'value' });
    assert.ok(iterator.return);
    await iterator.return();
    assert.equal(facade.acquisitions, 3);
    assert.equal(returnCount, 1);
  });

  it('closes distinct async iterable facades sharing a bare iterator only once', async () => {
    let returnCount = 0;
    const source: AsyncIterator<string> = {
      async next() {
        return { done: false, value: 'value' };
      },
      async return() {
        returnCount += 1;
        return { done: true, value: undefined };
      },
    };
    const first = {
      iterator: source,
      acquisitions: 0,
      [Symbol.asyncIterator]() {
        this.acquisitions += 1;
        return this.iterator;
      },
    };
    const second = { ...first };
    const iterator = merge(first, second)[Symbol.asyncIterator]();

    assert.deepEqual(await iterator.next(), { done: false, value: 'value' });
    assert.ok(iterator.return);
    await iterator.return();
    assert.equal(first.acquisitions, 1);
    assert.equal(second.acquisitions, 1);
    assert.equal(returnCount, 1);
  });

  it('closes repeated and distinct synchronous iterable facades sharing an iterator only once', async () => {
    let returnCount = 0;
    const source: Iterator<string> = {
      next() {
        return { done: false, value: 'value' };
      },
      return() {
        assert.equal(this, source);
        returnCount += 1;
        return { done: true, value: undefined };
      },
    };
    const first = {
      iterator: source,
      acquisitions: 0,
      [Symbol.iterator]() {
        this.acquisitions += 1;
        return this.iterator;
      },
    };
    const second = { ...first };
    const iterator = merge(first, first, second)[Symbol.asyncIterator]();

    assert.deepEqual(await iterator.next(), { done: false, value: 'value' });
    assert.ok(iterator.return);
    await iterator.return();
    assert.equal(first.acquisitions, 2);
    assert.equal(second.acquisitions, 1);
    assert.equal(returnCount, 1);
  });

  /* eslint-enable unicorn/no-this-outside-of-class */

  it('iterates duplicate repeatable sources independently', async () => {
    const source = ['one', 'two'];
    const values = await Array.fromAsync(merge(source, source));
    assert.deepEqual(values.sort(), ['one', 'one', 'two', 'two']);
  });

  it('does not return an iterator that exhausted normally', async () => {
    let returnCount = 0;
    let nextCount = 0;
    const source: AsyncIterableIterator<string> = {
      [Symbol.asyncIterator]: () => source,
      async next() {
        nextCount += 1;
        return nextCount === 1
          ? { done: false, value: 'value' }
          : { done: true, value: undefined };
      },
      async return() {
        returnCount += 1;
        return { done: true, value: undefined };
      },
    };

    assert.deepEqual(await Array.fromAsync(merge(source)), ['value']);
    assert.equal(nextCount, 2);
    assert.equal(returnCount, 0);
  });

  it('closes synchronous generators and bare async iterators on return', async () => {
    const closed: string[] = [];
    const synchronous = (function* () {
      try {
        yield 'sync';
        yield 'another sync';
      } finally {
        closed.push('sync');
      }
    })();
    const asynchronous: AsyncIterator<string> = {
      async next() {
        return { done: false, value: 'async' };
      },
      async return() {
        closed.push('async');
        return { done: true, value: undefined };
      },
    };
    const iterator = merge(synchronous, asynchronous)[Symbol.asyncIterator]();
    assert.equal((await iterator.next()).done, false);
    assert.ok(iterator.return);
    await iterator.return();
    assert.deepEqual(closed.sort(), ['async', 'sync']);
  });

  it('works with a bunch of crazy stuff', async () => {
    assert.deepEqual(
      (
        await pipeline(
          merge(
            ['10'],
            from([Promise.resolve('77')]),
            pipeline(['30'], passThru),
            from(['11', '12', Promise.resolve('58'), '14']),
            from(['41']),
          ),
          toArray,
        )
      ).sort(),
      ['10', '11', '12', '14', '30', '41', '58', '77'],
    );
  });

  it('works with a randomized merge tree', async () => {
    const TEST_SIZE = 1037;
    const input = Array.from({ length: TEST_SIZE }, () =>
      Math.ceil(Math.random() * 25),
    );

    function tree(elements: number[]): Asyncerator<number> {
      if (elements.length === 0) {
        return from([]);
      }
      if (elements.length === 1) {
        return from<number>([
          new Promise<number>((resolve) => {
            setTimeout(() => {
              resolve(elements[0]!);
            }, elements[0]);
          }),
        ] as unknown as Asyncerator<number>);
      }
      const splitInto = elements[0]!;
      const chunkSize = Math.ceil((elements.length - 1) / splitInto);
      const mergeables: Asyncerator<number>[] = [];
      for (let chunk = 0; chunk <= splitInto; chunk++) {
        mergeables.push(
          tree(elements.slice(chunk * chunkSize, (chunk + 1) * chunkSize)),
        );
      }
      return merge(...mergeables);
    }

    const result = await pipeline(tree(input), toArray);
    assert.deepEqual(input.sort(), result.sort());
  });
});
