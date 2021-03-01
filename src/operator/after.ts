// operator/after.ts

import debug from 'debug';

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

const log = debug('asyncerator:operator:after');

export default function <Input>(afterFunction: () => void): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    yield* iterator;
    try {
      afterFunction();
    } catch (errorObject) {
      log('WARNING: error thrown in after(), ignored', errorObject);
    }
  };
}
