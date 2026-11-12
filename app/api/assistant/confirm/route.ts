import { z } from "zod";
import {
  AssistantError,
  assistantErrorResponse,
  requireAssistantAdmin,
} from "@/lib/assistant/server";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireAssistantAdmin(request);
    const body = z
      .object({ draftId: z.string().uuid() })
      .safeParse(await request.json().catch(() => null));
    if (!body.success) throw new AssistantError("Proposta inválida.");
    const { data, error } = await supabase.rpc(
      "assistant_confirm_reservation",
      { p_draft_id: body.data.draftId },
    );
    if (error) {
      const publicMessages = [
        "Proposta não encontrada",
        "Proposta expirada",
        "Escolha uma data",
        "Cadastro do cliente mudou",
        "Itens inválidos",
        "Produto indisponível",
        "Um preço mudou",
        "Quantidade inválida",
        "Estoque insuficiente",
      ];
      throw new AssistantError(
        publicMessages.some((message) => error.message.startsWith(message))
          ? error.message
          : "Não consegui salvar a reserva. Confira a proposta e tente novamente.",
        409,
      );
    }
    return Response.json(
      { reservationId: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return assistantErrorResponse(error);
  }
}
