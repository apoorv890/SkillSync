/**
 * @param {string} tag
 */
export function createLogger(tag) {
  return {
    log: (msg) => console.log(`[${tag}] ${msg}`),
    warn: (msg) => console.warn(`[${tag}] ${msg}`),
    error: (msg, err) => {
      if (err) console.error(`[${tag}] ${msg}`, err);
      else console.error(`[${tag}] ${msg}`);
    },
  };
}
