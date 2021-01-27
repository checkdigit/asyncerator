// operator/before.ts

import debug from 'debug';
const log = debug('asyncerator:operator:before');

export default async function* <T>(
  iterator: AsyncIterable<T>,
  beforeFunction: () => void
): AsyncGenerator<T, void, undefined> {
  try {
    beforeFunction();
  } catch (errorObject) {
    log('WARNING: error thrown in before(), ignored', errorObject);
  }
  yield* iterator;
}
