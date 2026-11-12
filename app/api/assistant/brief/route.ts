import {
  assistantErrorResponse,
  dailyBrief,
  requireAssistantAdmin,
} from "@/lib/assistant/server";

export async function GET() {
  try {
    const { supabase } = await requireAssistantAdmin();
    return Response.json(await dailyBrief(supabase), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return assistantErrorResponse(error);
  }
}
