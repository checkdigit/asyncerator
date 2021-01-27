// operator/after.ts

import debug from 'debug';
const log = debug('asyncerator:operator:after');

export default async function* <T>(
  iterator: AsyncIterable<T>,
  afterFunction: () => void
): AsyncGenerator<T, void, undefined> {
  yield* iterator;
  try {
    afterFunction();
  } catch (errorObject) {
    log('WARNING: error thrown in after(), ignored', errorObject);
  }
}
