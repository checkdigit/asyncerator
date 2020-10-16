// worker/index.ts

/**
 * An AsyncWorker is an async function that given an item of type T, will asynchronously produce an item of type U
 */
export type AsyncWorker<T, U> = (item: T) => Promise<U>;

/**
 * AsyncWork is an async function that given an array of items of type T[], pass each item to an AsyncWorker to produce
 * an array of type U[].  The exact mechanism depends on how the AsyncWork was created (e.g. mapSeries or mapDynamic).
 */
export type AsyncWork<T, U> = (items: T[]) => Promise<U[]>;

export interface Work<T, U> {
  attempts: number;
  item: T;
  index: number;
  elapsed: number;
  result?: U;
  lastError?: { retryDelay: number };
}

export { default as dynamic } from './dynamic';
export { default as retry } from './retry';
export { default as timeout } from './timeout';
