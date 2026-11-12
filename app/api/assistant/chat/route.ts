import { APICallError } from "ai";
import { makeAssistant } from "@/lib/assistant/agent";
import { chatSchema } from "@/lib/assistant/schemas";
import {
  AssistantError,
  assistantErrorResponse,
  requireAssistantAdmin,
} from "@/lib/assistant/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await requireAssistantAdmin(request);
    if (!process.env.OPENAI_API_KEY)
      throw new AssistantError(
        "A inteligência do assistente ainda não está configurada neste ambiente.",
        503,
      );
    const raw = await request.text();
    if (raw.length > 32000)
      throw new AssistantError(
        "A conversa ficou longa. Inicie uma nova conversa.",
        413,
      );
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new AssistantError("Mensagem inválida.");
    }
    const body = chatSchema.safeParse(value);
    if (!body.success)
      throw new AssistantError(
        "Envie uma mensagem de até 4.000 caracteres ou inicie uma nova conversa.",
      );
    const quota = await supabase.rpc("assistant_consume_request");
    if (quota.error)
      throw new AssistantError(
        "Não consegui verificar o limite de uso do assistente.",
        503,
      );
    if (!quota.data)
      throw new AssistantError(
        "Limite de 100 mensagens por dia atingido. Sua agenda e tarefas continuam disponíveis.",
        429,
      );
    const { agent, drafts } = makeAssistant(supabase, userId);
    const result = await agent.generate({
      messages: body.data.messages,
      abortSignal: request.signal,
      timeout: 50000,
    });
    return Response.json(
      {
        text:
          result.text ||
          "Consulte o cartão preparado ou reformule seu pedido para continuarmos.",
        drafts,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (APICallError.isInstance(error)) {
      if (error.statusCode === 401 || error.statusCode === 403)
        return assistantErrorResponse(
          new AssistantError(
            "A chave da IA precisa ser revisada pelo administrador.",
            503,
          ),
        );
      if (error.statusCode === 429)
        return assistantErrorResponse(
          new AssistantError(
            "A IA está sem saldo ou atingiu um limite de uso. Confira a conta OpenAI.",
            503,
          ),
        );
    }
    return assistantErrorResponse(error);
  }
}
