export async function functionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const response = (error as { context?: unknown }).context;
    if (response instanceof Response) {
      try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === 'string' && body.error.length > 0) return body.error;
      } catch {
        // Fall through to the generic message.
      }
    }
  }
  if (error instanceof Error && error.message && !error.message.includes('non-2xx')) {
    return error.message;
  }
  return 'Something went wrong. Try again.';
}
