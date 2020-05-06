// operator/error.ts

import debug from 'debug';
const log = debug('asyncerator:operator:error');

export default async function* <T>(iterator: AsyncIterable<T>, errorFunction: (error: Error) => void) {
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
