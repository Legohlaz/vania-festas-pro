import { z } from "zod";
import {
  AssistantError,
  assistantErrorResponse,
  requireAssistantAdmin,
} from "@/lib/assistant/server";

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await requireAssistantAdmin(request);
    const body = z
      .object({
        title: z.string().trim().min(1).max(200),
        dueAt: z.string().datetime({ offset: true }),
      })
      .safeParse(await request.json().catch(() => null));
    if (!body.success)
      throw new AssistantError("Informe título, data e horário válidos.");
    const { data, error } = await supabase
      .from("assistant_tasks")
      .insert({
        title: body.data.title,
        due_at: body.data.dueAt,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new AssistantError("Não consegui salvar a tarefa.", 503);
    return Response.json(data);
  } catch (error) {
    return assistantErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, userId } = await requireAssistantAdmin(request);
    const body = z
      .object({ id: z.string().uuid() })
      .safeParse(await request.json().catch(() => null));
    if (!body.success) throw new AssistantError("Tarefa inválida.");
    const { data, error } = await supabase
      .from("assistant_tasks")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", body.data.id)
      .eq("created_by", userId)
      .select("id")
      .maybeSingle();
    if (error || !data)
      throw new AssistantError("Não consegui concluir a tarefa.", 409);
    return Response.json(data);
  } catch (error) {
    return assistantErrorResponse(error);
  }
}
