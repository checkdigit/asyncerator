// operator/before.ts

import debug from 'debug';
const log = debug('asyncerator:operator:before');

export default async function* <T>(
  iterator: AsyncIterable<T>,
  beforeFunction: () => T | void
): AsyncGenerator<T, void, undefined> {
  try {
    const result = beforeFunction();
    if (result !== undefined) {
      yield result;
    }
  } catch (errorObject) {
    log('WARNING: error thrown in before(), ignored', errorObject);
  }
  yield* iterator;
}
