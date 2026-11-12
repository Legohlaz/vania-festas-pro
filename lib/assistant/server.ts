import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import { todayInSalvador } from "./schemas";

export async function requireAssistantAdmin(request?: Request) {
  if (request && request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      throw new AssistantError("Origem da solicitação inválida.", 403);
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user)
    throw new AssistantError("Sua sessão expirou. Entre novamente.", 401);
  const { data: admin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || !admin)
    throw new AssistantError("Acesso exclusivo da administração.", 403);
  return { supabase, userId: data.user.id };
}

export type AssistantDb = Awaited<
  ReturnType<typeof requireAssistantAdmin>
>["supabase"];
export class AssistantError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function assistantErrorResponse(error: unknown) {
  const message =
    error instanceof AssistantError
      ? error.message
      : "Não consegui concluir essa ação. Tente novamente em instantes.";
  return Response.json(
    { error: message },
    {
      status: error instanceof AssistantError ? error.status : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function dailyBrief(supabase: AssistantDb) {
  const today = todayInSalvador();
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const [tasks, events, pending, drafts] = await Promise.all([
    supabase
      .from("assistant_tasks")
      .select("id,title,due_at,completed_at")
      .is("completed_at", null)
      .order("due_at")
      .limit(50),
    supabase
      .from("reservations")
      .select(
        "id,customer_name,event_date,status,logistics_status,event_address",
      )
      .in("status", ["pending", "confirmed"])
      .gte("event_date", today)
      .lte("event_date", end.toISOString().slice(0, 10))
      .order("event_date")
      .limit(50),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("assistant_reservation_drafts")
      .select("id,payload,reservation_id,expires_at")
      .is("reservation_id", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (tasks.error || events.error || pending.error || drafts.error)
    throw new AssistantError(
      "Não consegui consultar sua agenda. Confira a conexão do sistema e tente novamente.",
      503,
    );
  return {
    today,
    tasks: tasks.data ?? [],
    events: events.data ?? [],
    pendingCount: pending.count ?? 0,
    drafts: drafts.data ?? [],
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
  };
}
