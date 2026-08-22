// Root layout also wraps preview routes; no-JS fallbacks cannot run route guards.
export function shouldRenderGtmNoScriptFallback(): boolean {
  return false;
}
