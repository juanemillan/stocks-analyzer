/** Keeps infrastructure details out of customer-facing error messages. */
export function dashboardLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|connect|ECONN|connection/i.test(message)) return "No pudimos conectar con los datos de mercado. Intenta nuevamente.";
  if (/not authenticated|unauthorized|forbidden/i.test(message)) return "Tu sesión expiró. Inicia sesión nuevamente.";
  return "No pudimos cargar los datos. Intenta nuevamente.";
}
