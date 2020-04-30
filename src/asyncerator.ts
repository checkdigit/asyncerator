// asyncerator.ts

import debug from 'debug';
const log = debug('asyncerator');

/**
 * Asyncerator extends AsyncIterableIterator to provide standard Array-like utility operators.
 */
export interface Asyncerator<T> extends AsyncIterableIterator<T> {
  map<U>(mapFunction: (value: T) => U): Asyncerator<U>;
  filter(filterFunction: (value: T) => boolean): Asyncerator<T>;
  filter<U extends T>(filterFunction: (value: T) => value is U): Asyncerator<U>;
  forEach(forEachFunction: (value: T) => void): Asyncerator<T>;
  complete(completeFunction: () => void): Asyncerator<T>;
  error(errorFunction: (error: Error) => void): Asyncerator<T>;
  split(separator: string, limit?: number): Asyncerator<string>;
  toArray(): Promise<T[]>;
}

/*
 * Asyncable is similar to AsyncIterableIterator, but does not extend AsyncIterator.   It's also similar to
 * AsyncIterable, but [Symbol.asyncIterator]() returns an AsyncIterableIterator instead of an AsyncIterator.  Got it?
 * 1) It is still compatible with for-await.
 * 2) This should be defined in a standard library somewhere, since this interface is that many node modules
 *    (e.g. readline, streaming stuff) actually implement.
 * 3) Yes it's annoying.
 */
export interface Asyncable<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}

async function* forEachOperator<T>(iterator: AsyncIterable<T>, forEachFunction: (value: T) => void) {
  for await (const item of iterator) {
    forEachFunction(item);
    yield item;
  }
}

async function* mapOperator<T, U>(iterator: AsyncIterable<T>, mapFunction: (value: T) => U) {
  for await (const item of iterator) {
    yield mapFunction(item);
  }
}

async function* filterOperator<T>(iterator: AsyncIterable<T>, filterFunction: (value: T) => boolean) {
  for await (const item of iterator) {
    if (filterFunction(item)) {
      yield item;
    }
  }
}

async function* completeOperator<T>(iterator: AsyncIterable<T>, completeFunction: () => void) {
  for await (const item of iterator) {
    yield item;
  }
  try {
    completeFunction();
  } catch (error) {
    log('WARNING: error thrown in complete(), ignored', error);
  }
}

async function* errorOperator<T>(iterator: AsyncIterable<T>, errorFunction: (error: Error) => void) {
  try {
    for await (const item of iterator) {
      yield item;
    }
  } catch (error) {
    try {
      errorFunction(error);
    } catch (errorFunctionError) {
      log('WARNING: error thrown in error(), handling', error, 'ignored', errorFunctionError);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function* splitOperator<T>(iterator: AsyncIterable<T>, separator: string, limit = Infinity) {
  if (limit === 0) {
    return;
  }

  let previous = '';
  let count = 0;
  for await (const chunk of iterator) {
    if (
      typeof chunk === 'undefined' ||
      chunk === null ||
      typeof (chunk as { toString: Function }).toString !== 'function'
    ) {
      throw Error(`${JSON.stringify(chunk)} not convertible to a string`);
    }
    previous += (chunk as { toString: Function }).toString();
    let index;
    while (previous.length > 0 && (index = separator === '' ? 1 : previous.indexOf(separator)) >= 0) {
      const line = previous.slice(0, index);
      yield line;
      if (++count >= limit) {
        return;
      }
      previous = previous.slice(index + (separator === '' ? 0 : 1));
    }
  }
  if ((separator !== '' && count > 0) || (previous.length > 0 && count < limit)) {
    yield previous;
  }
}

/**
 * Turn an async iterable iterator into an Array.
 * This will wait until the iterator is done before returning an array, so be careful using this
 * with endless iterators (in other words, don't do that).
 */
async function toArray<T>(iterator: AsyncIterable<T>): Promise<T[]> {
  const results = [];
  for await (const result of iterator) {
    results.push(result);
  }
  return results;
}

function create<T>(source: Asyncable<T> | (() => Asyncable<T>)): Asyncerator<T> {
  const iterator = typeof source === 'function' ? source()[Symbol.asyncIterator]() : source[Symbol.asyncIterator]();
  return {
    [Symbol.asyncIterator]() {
      return iterator;
    },
    next(...args) {
      return iterator.next(...args);
    },
    ...(typeof iterator.return !== 'undefined'
      ? {
          return(...args) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            return iterator.return(...args);
          },
        }
      : {}),
    ...(typeof iterator.throw !== 'undefined'
      ? {
          throw(...args) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            return iterator.throw(...args);
          },
        }
      : {}),
    map: (mapFunction) => create(mapOperator(iterator, mapFunction)),
    filter: (filterFunction: (value: T) => boolean) => create(filterOperator(iterator, filterFunction)),
    split: (separator: string, limit?: number) => create(splitOperator(iterator, separator, limit)),
    forEach: (tapFunction) => create(forEachOperator(iterator, tapFunction)),
    complete: (completeFunction) => create(completeOperator(iterator, completeFunction)),
    error: (errorFunction) => create(errorOperator(iterator, errorFunction)),
    toArray: () => toArray(iterator),
  };
}

/**
 * Turn an Array (or any iterable) into an Asyncerator.
 *
 * @param source
 */
export function from<T>(
  source: Iterator<T> | Iterable<T> | AsyncIterator<T> | AsyncIterable<T> | (() => Asyncable<T>)
): Asyncerator<T> {
  let iterator: Iterator<T> | AsyncIterator<T>;

  if (typeof source === 'function') {
    return create(source);
  } else if (typeof (source as Asyncable<T>)[Symbol.asyncIterator] === 'function') {
    iterator = (source as Asyncable<T>)[Symbol.asyncIterator]();
    if (typeof (iterator as AsyncIterableIterator<T>)[Symbol.asyncIterator] === 'function') {
      // this is already an async iterable iterator, so we're good to go as-is
      return create(source as AsyncIterableIterator<T>);
    }
  } else if (typeof (source as IterableIterator<T>)[Symbol.iterator] === 'function') {
    // we know for sure this is a normal, synchronous iterator
    const synchronousIterator = (source as IterableIterator<T>)[Symbol.iterator]();
    // eslint-disable-next-line func-names
    return create(async function* () {
      for (let item = synchronousIterator.next(); !item.done; item = synchronousIterator.next()) {
        yield item.value;
      }
    });
  } else {
    // could be an Iterator or an AsyncIterator but we can't tell the difference, so treat it as async regardless
    iterator = source as AsyncIterator<T>;
  }

  // eslint-disable-next-line func-names
  return create(async function* () {
    // eslint-disable-next-line no-await-in-loop
    for (let item = await iterator.next(); !item.done; item = await iterator.next()) {
      yield item.value;
    }
  });
}

/**
 * Similar to Promise.all(), but instead returns values as they become available via an Asyncerator.
 * Note: the output order is not the same as the input order, the fastest promise to resolve
 * will be first, the slowest last.
 *
 * @param promises
 */
export function all<T>(promises: Iterable<Promise<T>>): Asyncerator<T> {
  // eslint-disable-next-line func-names
  return create(async function* () {
    const output: T[] = [];
    const pending = new Set(promises);

    for (const promise of promises) {
      promise
        .then((value) => {
          output.push(value);
          pending.delete(promise);
        })
        .catch(() => {
          // we don't handle the error here, will be taken care of below by the Promise.race()
        });
    }

    while (pending.size > 0) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.race([...pending]);
      for (const item of output) {
        yield item;
      }
      output.length = 0;
    }
  });
}

/**
 * Merge multiple async iterators into a single Asyncerator.  If an iterator yields another async iterator,
 * merge it's output into the stream.
 *
 * @param iterators
 */
export function merge<T>(...iterators: AsyncIterator<T | AsyncIterator<T>>[]): Asyncerator<T> {
  async function createPending<T>(iterator: AsyncIterator<T>, index: number) {
    return { index, iterator, result: await iterator.next() };
  }

  // eslint-disable-next-line func-names
  return create(async function* () {
    const pending = iterators.map(createPending);
    const indexMap = iterators.map((value, index) => index);

    while (pending.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      const { result, iterator, index } = await Promise.race(pending);

      if (result.done) {
        // delete this iterable from pending
        pending.splice(indexMap[index], 1);
        for (let position = index + 1; position < indexMap.length; position++) {
          indexMap[position]--;
        }
      } else {
        if ((result.value as AsyncIterableIterator<T>)[Symbol.asyncIterator]) {
          // this is another async iterable iterator, so merge its output into the pending
          pending.push(
            (async (newIterator, newIndex) => {
              return {
                index: newIndex,
                iterator: newIterator,
                result: await newIterator.next(),
              };
            })(merge(result.value as AsyncIterableIterator<T>), indexMap.length)
          );
          indexMap.push(pending.length - 1);
        } else {
          yield result.value;
        }

        // start waiting for the next result from this iterable
        pending[indexMap[index]] = createPending(iterator, index);
      }
    }
  }) as Asyncerator<T>;
}

/**
 * Combine the output of iterators in a series.  Requires all the iterators to complete.
 *
 * @param iterators
 */
export function series<T>(...iterators: Asyncable<T>[]): Asyncerator<T> {
  // eslint-disable-next-line func-names
  return create(async function* () {
    for await (const iterator of iterators) {
      for await (const item of iterator) {
        yield item;
      }
    }
  });
}
