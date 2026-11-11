export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind?: string; routePath?: string },
) {
  console.error("[request-error]", {
    path: request.path,
    method: request.method,
    route: context.routePath,
    kind: context.routerKind,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
