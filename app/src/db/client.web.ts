/** Web has no on-device SQLite. Callers already fall back to in-memory data. */
export function getDb(): Promise<never> {
  return Promise.reject(new Error('SQLite is not available on web'));
}
