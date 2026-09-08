// asyncerator.spec.ts

/*
 * Copyright (c) 2021-2026 Check Digit, LLC
 *
 * This code is licensed under the MIT license (see LICENSE.txt for details).
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { from, pipeline, toArray } from './index.ts';

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
    assert.deepEqual(await pipeline(from(range), toArray), [0, 1, 2, 3]);
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
    assert.deepEqual(await pipeline(from(iterable), toArray), [0, 1, 2, 3]);
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
    assert.deepEqual(
      await pipeline(from(asyncIterator), toArray),
      [0, 1, 2, 3],
    );
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
    assert.deepEqual(
      await pipeline(from(asyncIterable), toArray),
      [0, 1, 2, 3],
    );
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
    const asyncerator = from(
      asyncIterableIterator,
    ) as AsyncIterableIterator<number>;
    assert.equal(asyncerator, asyncIterableIterator);
    assert.deepEqual(await pipeline(asyncerator, toArray), [0, 1, 2, 3]);
    if (asyncerator.throw === undefined || asyncerator.return === undefined) {
      throw new Error();
    }
    assert.deepEqual(await asyncerator.throw(), { done: true, value: 'throw' });
    assert.deepEqual(await asyncerator.return(), {
      done: true,
      value: 'return',
    });
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
    const asyncerator = from(
      asyncIterableIterator,
    ) as AsyncIterableIterator<number>;
    assert.deepEqual(await pipeline(asyncerator, toArray), [0, 1, 2, 3]);

    assert.equal(asyncerator.throw, undefined);

    assert.equal(asyncerator.return, undefined);
  });

  it('an async iterable iterator', async () => {
    const iterable = from(from(['abc', Promise.resolve('def'), 'ghi']));
    const items = await Array.fromAsync(iterable);
    assert.deepEqual(items, ['abc', 'def', 'ghi']);
  });

  it('an async generator function', async () => {
    const iterable = from(
      (async function* () {
        yield 'abc';
        yield 'def';
        yield 'ghi';
      })(),
    );
    const items = await Array.fromAsync(iterable);
    assert.deepEqual(items, ['abc', 'def', 'ghi']);
  });

  it('reject if array item is a promise that rejects', async () => {
    await assert.rejects(
      pipeline(from([Promise.reject(new Error('Reject'))]), toArray),
      { message: 'Reject' },
    );
  });

  it('closes a synchronous generator when consumption stops early', async () => {
    let hasClosed = false;
    function* source() {
      try {
        yield 1;
        yield 2;
      } finally {
        hasClosed = true;
      }
    }

    // Exercise iterator closing through an early break.
    // eslint-disable-next-line no-unreachable-loop
    for await (const value of from(source())) {
      assert.equal(value, 1);
      break;
    }

    assert.ok(hasClosed);
  });

  it('closes a synchronous generator when a yielded promise rejects', async () => {
    const failure = new Error('yield failed');
    let hasClosed = false;
    function* source() {
      try {
        yield Promise.reject(failure);
      } finally {
        hasClosed = true;
      }
    }

    await assert.rejects(
      from(source())[Symbol.asyncIterator]().next(),
      failure,
    );
    assert.ok(hasClosed);
  });

  it('awaits a bare async iterator cleanup before completing an early break', async () => {
    const cleanupStarted = Promise.withResolvers<undefined>();
    const cleanupReleased = Promise.withResolvers<undefined>();
    let hasFinished = false;
    let hasClosed = false;
    const source: AsyncIterator<number> = {
      async next() {
        return { done: false, value: 1 };
      },
      async return() {
        cleanupStarted.resolve(undefined);
        await cleanupReleased.promise;
        hasClosed = true;
        return { done: true, value: undefined };
      },
    };

    const consumption = (async () => {
      // Exercise iterator closing through an early break.
      // eslint-disable-next-line no-unreachable-loop
      for await (const value of from(source)) {
        assert.equal(value, 1);
        break;
      }
      hasFinished = true;
    })();

    await cleanupStarted.promise;
    assert.equal(hasFinished, false);
    assert.equal(hasClosed, false);
    cleanupReleased.resolve(undefined);
    await consumption;
    assert.ok(hasClosed);
    assert.ok(hasFinished);
  });

  it('closes a bare async iterator when next rejects', async () => {
    const failure = new Error('next failed');
    let hasClosed = false;
    const source: AsyncIterator<number> = {
      async next() {
        throw failure;
      },
      async return() {
        hasClosed = true;
        return { done: true, value: undefined };
      },
    };

    await assert.rejects(from(source)[Symbol.asyncIterator]().next(), failure);
    assert.ok(hasClosed);
  });

  it('preserves an iteration error when cleanup also rejects', async () => {
    const failure = new Error('next failed');
    const source: AsyncIterator<number> = {
      async next() {
        throw failure;
      },
      async return() {
        throw new Error('cleanup failed');
      },
    };

    await assert.rejects(from(source)[Symbol.asyncIterator]().next(), failure);
  });

  it('propagates a cleanup error when consumption stops early', async () => {
    const failure = new Error('cleanup failed');
    const source: AsyncIterator<number> = {
      async next() {
        return { done: false, value: 1 };
      },
      async return() {
        throw failure;
      },
    };

    await assert.rejects(async () => {
      // Exercise iterator closing through an early break.
      // eslint-disable-next-line no-unreachable-loop
      for await (const value of from(source)) {
        assert.equal(value, 1);
        break;
      }
    }, failure);
  });

  it('does not close wrapped iterators after ordinary exhaustion', async () => {
    const source: Iterator<number> = {
      next() {
        return { done: true, value: undefined };
      },
      return() {
        assert.fail('An exhausted iterator must not be closed again');
      },
    };

    assert.deepEqual(await Array.fromAsync(from(source)), []);
    assert.deepEqual(
      await Array.fromAsync(from({ [Symbol.iterator]: () => source })),
      [],
    );
  });

  it('forwards cancellation while a bare async iterator next is pending', async () => {
    const pending = Promise.withResolvers<IteratorResult<number>>();
    let returns = 0;
    const source: AsyncIterator<number> = {
      next() {
        return pending.promise;
      },
      async return() {
        returns++;
        const result = { done: true, value: undefined } as const;
        pending.resolve(result);
        return result;
      },
    };
    const iterator = from(source)[Symbol.asyncIterator]();
    assert.ok(iterator.return);
    const next = iterator.next();
    const firstReturn = iterator.return();
    const secondReturn = iterator.return();

    assert.equal(returns, 1);
    assert.deepEqual(await Promise.all([next, firstReturn, secondReturn]), [
      { done: true, value: undefined },
      { done: true, value: undefined },
      { done: true, value: undefined },
    ]);
  });

  it('closes an acquired iterator before its wrapper has started', async () => {
    let returns = 0;
    const source: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next() {
            assert.fail('The iterator must not be advanced during cleanup');
          },
          return() {
            returns++;
            return { done: true, value: undefined };
          },
        };
      },
    };
    const iterator = from(source)[Symbol.asyncIterator]();
    assert.ok(iterator.return);

    assert.deepEqual(await iterator.return(), {
      done: true,
      value: undefined,
    });
    await iterator.return();
    assert.equal(returns, 1);
  });

  it('preserves pending iteration errors when cancellation also rejects', async () => {
    const pending = Promise.withResolvers<IteratorResult<number>>();
    const failure = new Error('next failed');
    let returns = 0;
    const source: AsyncIterator<number> = {
      next() {
        return pending.promise;
      },
      async return() {
        returns++;
        pending.reject(failure);
        throw new Error('cleanup failed');
      },
    };
    const iterator = from(source)[Symbol.asyncIterator]();
    assert.ok(iterator.return);
    const next = iterator.next();
    const cancellation = iterator.return();

    assert.equal(returns, 1);
    await Promise.all([assert.rejects(next, failure), cancellation]);
    assert.equal(returns, 1);
  });
});
