// worker/timeout.ts

const DEFAULT_TIMEOUT = 60000;

/**
 * Promise with timeout implementation.  If promise takes longer than time milliseconds to resolve, reject
 * @param time
 */
export default function (time = DEFAULT_TIMEOUT) {
  return async function <T>(promise: Promise<T>): Promise<T> {
    let handle;
    try {
      return await Promise.race([
        new Promise((_: (value: T) => void, reject) => {
          handle = setTimeout(reject, time);
        }),
        promise,
      ]);
    } finally {
      if (typeof handle !== 'undefined') {
        clearTimeout(handle);
      }
    }
  };
}
