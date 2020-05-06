// source/from.ts

import create, { Asyncable, Asyncerator } from '../create';

/**
 * Turn an Array (or any iterable) into an Asyncerator.
 *
 * @param source
 */
export default function <T>(
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
