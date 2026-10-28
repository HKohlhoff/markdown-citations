type UnsupportedSyncFetch = ((resource: unknown) => never) & {
  Headers: typeof Headers;
};

const syncFetch = ((resource: unknown): never => {
  throw new Error(
    `Synchronous network loading is unavailable in Markdown Citations: ${String(resource)}`,
  );
}) as UnsupportedSyncFetch;

syncFetch.Headers = Headers;

export default syncFetch;
