// timeout.ts

const MINIMUM_TIMEOUT = 1; // 1ms
const DEFAULT_TIMEOUT = 60000; // 1 minute
const MAXIMUM_TIMEOUT = 900000; // 15 minutes

export interface TimeoutOptions {
  timeout?: number;
}

export class TimeoutError extends Error {
  constructor(public timeout: number) {
    super(`Timeout after ${timeout}ms`);
  }
}

/**
 * Promise with timeout implementation.  If promise takes longer than timeout milliseconds to resolve, reject with
 * a TimeoutError.
 * @param timeout
 */
export default function (
  { timeout = DEFAULT_TIMEOUT }: TimeoutOptions = {
    timeout: DEFAULT_TIMEOUT,
  }
): <T>(promise: Promise<T>) => Promise<T> {
  if (timeout < MINIMUM_TIMEOUT || timeout > MAXIMUM_TIMEOUT) {
    // Node's built-in setTimeout will default the delay to 1ms if the delay is larger than 2147483647ms or less than 1ms.
    // Instead, we error if the argument is invalid.
    throw RangeError(`The argument must be >= ${MINIMUM_TIMEOUT} and <= ${MAXIMUM_TIMEOUT}`);
  }

  return async function <T>(promise: Promise<T>): Promise<T> {
    let handle: NodeJS.Timeout | undefined;
    try {
      return (await Promise.race([
        (async () => {
          const result = await promise;
          if (handle !== undefined) {
            clearTimeout(handle);
            handle = undefined;
          }
          return result;
        })(),
        new Promise((_, reject) => {
          handle = setTimeout(() => {
            reject(new TimeoutError(timeout));
          }, timeout);
        }),
      ])) as T;
    } finally {
      if (handle !== undefined) {
        clearTimeout(handle);
        handle = undefined;
      }
    }
  };
}
