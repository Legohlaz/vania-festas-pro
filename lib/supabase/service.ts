import { createClient } from "@supabase/supabase-js";

/**
 * Cliente exclusivo para rotas executadas no servidor.
 * Nunca importe este arquivo em componentes do navegador.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("A chave de servi\u00e7o do Supabase n\u00e3o est\u00e1 configurada.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
