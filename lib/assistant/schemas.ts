import { z } from "zod";

export function todayInSalvador(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Informe uma data válida.");

export const draftSchema = z
  .object({
    customerId: z.number().int().positive(),
    eventDate: dateSchema,
    eventAddress: z.string().trim().min(3).max(500),
    serviceFee: z.number().min(0).max(100000),
    notes: z.string().max(1500),
    items: z
      .array(
        z.object({
          productId: z.number().int().positive(),
          quantity: z.number().int().min(1).max(10000),
        }),
      )
      .min(1)
      .max(40),
  })
  .refine(
    (draft) =>
      new Set(draft.items.map((item) => item.productId)).size ===
      draft.items.length,
    "Agrupe as quantidades de produtos repetidos.",
  );

export const chatSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(4000),
        }),
      )
      .min(1)
      .max(20),
  })
  .refine(
    (body) => body.messages.at(-1)?.role === "user",
    "Envie uma mensagem.",
  );

export function searchTerm(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export type ReservationDraft = {
  id: string;
  payload: Omit<z.infer<typeof draftSchema>, "items"> & {
    customerName: string;
    customerPhone: string;
    items: {
      productId: number;
      quantity: number;
      name: string;
      unitPrice: number;
    }[];
    total: number;
  };
  reservation_id: number | null;
  expires_at: string;
};

export type DailyTask = {
  id: string;
  title: string;
  due_at: string;
  completed_at: string | null;
};
export type DailyEvent = {
  id: number;
  customer_name: string | null;
  event_date: string;
  status: string;
  logistics_status: string;
  event_address: string | null;
};
export type DailyBrief = {
  today: string;
  tasks: DailyTask[];
  events: DailyEvent[];
  pendingCount: number;
  drafts: ReservationDraft[];
  aiConfigured: boolean;
};
