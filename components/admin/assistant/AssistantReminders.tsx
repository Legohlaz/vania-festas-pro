"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { DailyBrief } from "@/lib/assistant/schemas";

export function AssistantReminders() {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const shown = new Set<string>();
    async function check() {
      if (!active) return;
      try {
        if (
          window.localStorage.getItem("vania-assistant-notifications-v1") !==
          "on"
        )
          return;
        const response = await fetch("/api/assistant/brief", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok || !active) return;
        const brief = (await response.json()) as DailyBrief;
        const dailyKey = `vania-assistant-day:${brief.today}`;
        if (!window.sessionStorage.getItem(dailyKey)) {
          const eventsToday = brief.events.filter(
            (event) => event.event_date === brief.today,
          ).length;
          const summary = `Hoje: ${eventsToday} evento(s), ${brief.tasks.length} tarefa(s) aberta(s) e ${brief.pendingCount} reserva(s) pendente(s).`;
          window.sessionStorage.setItem(dailyKey, "1");
          setNotice(summary);
        }
        const due = brief.tasks.filter(
          (task) =>
            !task.completed_at && new Date(task.due_at).getTime() <= Date.now(),
        );
        for (const task of due) {
          const key = `vania-assistant-reminded:${task.id}:${task.due_at}`;
          if (shown.has(key) || window.sessionStorage.getItem(key)) continue;
          shown.add(key);
          window.sessionStorage.setItem(key, "1");
          setNotice(task.title);
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("Aurora · Lembrete", {
                body: task.title,
                tag: task.id,
              });
            } catch {
              /* O aviso no painel continua disponível em navegadores sem suporte. */
            }
          }
        }
      } catch {
        /* A agenda permanece acessível após uma falha temporária de conexão. */
      }
    }
    void check();
    const timer = window.setInterval(() => void check(), 60000);
    window.addEventListener("focus", check);
    window.addEventListener("vania-assistant-settings", check);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("vania-assistant-settings", check);
    };
  }, []);

  return (
    <div className="no-print fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-40px)] flex-col items-end gap-3">
      {notice && (
        <div
          className="flex max-w-sm items-start gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-xl"
          role="status"
        >
          <div>
            <p className="text-xs font-black text-emerald-800">
              Aurora está lembrando você
            </p>
            <p className="mt-2 text-sm text-slate-600">{notice}</p>
          </div>
          <button
            type="button"
            aria-label="Fechar lembrete"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <Link
        href="/admin/assistente"
        className="inline-flex items-center gap-2 rounded-full border border-emerald-700/10 bg-emerald-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-800"
      >
        <Sparkles size={17} /> Aurora
      </Link>
    </div>
  );
}
