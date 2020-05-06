// operator.ts

import debug from 'debug';
const log = debug('asyncerator:operators');

export async function* forEach<T>(iterator: AsyncIterable<T>, forEachFunction: (value: T) => void) {
  for await (const item of iterator) {
    forEachFunction(item);
    yield item;
  }
}

export async function* map<T, U>(iterator: AsyncIterable<T>, mapFunction: (value: T) => U) {
  for await (const item of iterator) {
    yield mapFunction(item);
  }
}

export async function* filter<T>(iterator: AsyncIterable<T>, filterFunction: (value: T) => boolean) {
  for await (const item of iterator) {
    if (filterFunction(item)) {
      yield item;
    }
  }
}

export async function* complete<T>(iterator: AsyncIterable<T>, completeFunction: () => void) {
  for await (const item of iterator) {
    yield item;
  }
  try {
    completeFunction();
  } catch (errorObject) {
    log('WARNING: error thrown in complete(), ignored', errorObject);
  }
}

export async function* error<T>(iterator: AsyncIterable<T>, errorFunction: (error: Error) => void) {
  try {
    for await (const item of iterator) {
      yield item;
    }
  } catch (errorObject) {
    try {
      errorFunction(errorObject);
    } catch (errorFunctionError) {
      log('WARNING: error thrown in error(), handling', errorObject, 'ignored', errorFunctionError);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function* split<T>(iterator: AsyncIterable<T>, separator: string, limit = Infinity) {
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
