// operator/index.ts

import type { Asyncerator } from '../asyncerator';
export type Operator<Input, Output> = (input: Asyncerator<Input>) => Asyncerator<Output>;

export { default as forEach } from './for-each';
export { default as map } from './map';
export { default as race } from './race';
export { default as filter } from './filter';
export { default as flat } from './flat';
export { default as after } from './after';
export { default as before } from './before';
export { default as onError } from './on-error';
export { default as split } from './split';
