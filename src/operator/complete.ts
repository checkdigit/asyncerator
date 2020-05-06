// operator/complete.ts

import debug from 'debug';
const log = debug('asyncerator:operator:complete');

export default async function* <T>(iterator: AsyncIterable<T>, completeFunction: () => void) {
  for await (const item of iterator) {
    yield item;
  }
  try {
    completeFunction();
  } catch (errorObject) {
    log('WARNING: error thrown in complete(), ignored', errorObject);
  }
}
