// worker/index.ts

/**
 * An AsyncWorker is an async function that given an item of type T, will asynchronously produce an item of type U
 */
export type AsyncWorker<T, U> = (item: T) => Promise<U>;

export { default as retry } from './retry';
export { default as timeout } from './timeout';
