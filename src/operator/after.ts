// operator/after.ts

import debug from 'debug';
const log = debug('asyncerator:operator:after');

export default async function* <T>(
  iterator: AsyncIterable<T>,
  afterFunction: () => T | void
): AsyncGenerator<T, void, undefined> {
  yield* iterator;
  try {
    const result = afterFunction();
    if (result !== undefined) {
      yield result;
    }
  } catch (errorObject) {
    log('WARNING: error thrown in after(), ignored', errorObject);
  }
}
