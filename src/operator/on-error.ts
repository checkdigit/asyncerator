// operator/on-error.ts

import debug from 'debug';

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

const log = debug('asyncerator:operator:error');

export default function <Input, Output>(errorFunction: (error: Error) => void): Operator<Input, Output> {
  return async function* (iterator: Asyncerator<Input>) {
    try {
      yield* (iterator as unknown) as Asyncerator<Output>;
    } catch (errorObject) {
      try {
        errorFunction(errorObject);
      } catch (errorFunctionError) {
        log('WARNING: error thrown in error(), handling', errorObject, 'ignored', errorFunctionError);
      }
    }
  };
}
