// operator/after.ts

import debug from 'debug';

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

const log = debug('asyncerator:operator:after');

export default function <Input, Output>(afterFunction: () => Output | void): Operator<Input, Output> {
  return async function* (iterator: Asyncerator<Input>) {
    yield* (iterator as unknown) as Asyncerator<Output>;
    try {
      const result = afterFunction();
      if (result !== undefined) {
        yield result;
      }
    } catch (errorObject) {
      log('WARNING: error thrown in after(), ignored', errorObject);
    }
  };
}
