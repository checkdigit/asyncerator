// operator/before.ts

import debug from 'debug';

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

const log = debug('asyncerator:operator:before');

export default function <Input, Output>(beforeFunction: () => Output | void): Operator<Input, Output> {
  return async function* (iterator: Asyncerator<Input>) {
    try {
      const result = beforeFunction();
      if (result !== undefined) {
        yield result;
      }
    } catch (errorObject) {
      log('WARNING: error thrown in before(), ignored', errorObject);
    }
    yield* (iterator as unknown) as Asyncerator<Output>;
  };
}
