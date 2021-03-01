// operator/before.ts

import debug from 'debug';

import type { Asyncerator } from '../asyncerator';

import type { Operator } from './index';

const log = debug('asyncerator:operator:before');

export default function <Input>(beforeFunction: () => void): Operator<Input, Input> {
  return async function* (iterator: Asyncerator<Input>) {
    try {
      beforeFunction();
    } catch (errorObject) {
      log('WARNING: error thrown in before(), ignored', errorObject);
    }
    yield* iterator;
  };
}
