"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  LoaderCircle,
  Mic,
  MicOff,
  Plus,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { DailyBrief, ReservationDraft } from "@/lib/assistant/schemas";
import styles from "./AssistantConsole.module.css";

type Message = { role: "user" | "assistant"; content: string };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const starters = [
  "O que preciso fazer hoje?",
  "Quero preparar uma reserva",
  "Quais eventos temos nesta semana?",
  "Quero criar um lembrete",
];

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "O sistema não respondeu. Tente novamente.",
    );
  return result as T;
}

export function AssistantConsole() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [drafts, setDrafts] = useState<ReservationDraft[]>([]);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [notices, setNotices] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const data = await api<DailyBrief>("/api/assistant/brief");
    setBrief(data);
    setDrafts((current) => [
      ...current.filter((draft) => draft.reservation_id),
      ...data.drafts,
    ]);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (active) await refresh();
      } catch (reason) {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Falha ao carregar o dia.",
          );
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60000);
    const voiceWindow = window as VoiceWindow;
    queueMicrotask(() => {
      if (!active) return;
      setVoiceAvailable(
        Boolean(
          voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition,
        ),
      );
      try {
        setNotices(
          window.localStorage.getItem("vania-assistant-notifications-v1") ===
            "on",
        );
      } catch {
        /* O navegador pode bloquear armazenamento local. */
      }
    });
    return () => {
      active = false;
      window.clearInterval(timer);
      recognition.current?.abort();
      abort.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, [refresh]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      setError("Seu navegador não oferece leitura por voz.");
      return;
    }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text.slice(0, 4000));
    speech.lang = "pt-BR";
    speech.rate = 1.04;
    const voice = window.speechSynthesis
      .getVoices()
      .find((entry) => entry.lang.startsWith("pt-BR"));
    if (voice) speech.voice = voice;
    window.speechSynthesis.speak(speech);
  }

  async function send(text: string) {
    if (busyRef.current || !text.trim()) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setInput("");
    recognition.current?.abort();
    window.speechSynthesis?.cancel();
    const next: Message[] = [
      ...messages.slice(-18),
      { role: "user", content: text.trim() },
    ];
    setMessages(next);
    const controller = new AbortController();
    abort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 55000);
    try {
      const response = await api<{ text: string; drafts: ReservationDraft[] }>(
        "/api/assistant/chat",
        {
          method: "POST",
          body: JSON.stringify({ messages: next }),
          signal: controller.signal,
        },
      );
      setMessages([...next, { role: "assistant", content: response.text }]);
      setDrafts((current) => [
        ...current.filter(
          (draft) => !response.drafts.some((entry) => entry.id === draft.id),
        ),
        ...response.drafts,
      ]);
      if (speakReplies) speak(response.text);
      await refresh().catch(() => {});
    } catch (reason) {
      setError(
        reason instanceof Error && reason.name !== "AbortError"
          ? reason.message
          : "A resposta demorou mais que o esperado. Consulte as propostas e tente novamente.",
      );
    } finally {
      window.clearTimeout(timeout);
      busyRef.current = false;
      setBusy(false);
    }
  }

  function dictate() {
    if (listening) {
      recognition.current?.abort();
      return;
    }
    const voiceWindow = window as VoiceWindow;
    const Constructor =
      voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition;
    if (!Constructor) return;
    window.speechSynthesis?.cancel();
    const engine = new Constructor();
    engine.lang = "pt-BR";
    engine.continuous = false;
    engine.interimResults = false;
    engine.onresult = (event) =>
      setInput(event.results[0]?.[0]?.transcript || "");
    engine.onerror = () => {
      setError(
        "Não consegui ouvir. Confira a permissão do microfone ou digite seu pedido.",
      );
      setListening(false);
    };
    engine.onend = () => setListening(false);
    recognition.current = engine;
    try {
      engine.start();
      setListening(true);
    } catch {
      setError("O microfone não pôde ser iniciado.");
    }
  }

  async function addTask(event: FormEvent) {
    event.preventDefault();
    if (savingTask) return;
    setSavingTask(true);
    setError("");
    try {
      const date = new Date(`${taskTime}:00-03:00`);
      if (!Number.isFinite(date.getTime()))
        throw new Error("Escolha data e horário válidos.");
      await api("/api/assistant/tasks", {
        method: "POST",
        body: JSON.stringify({ title: taskTitle, dueAt: date.toISOString() }),
      });
      setTaskTitle("");
      setTaskTime("");
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não consegui salvar a tarefa.",
      );
    } finally {
      setSavingTask(false);
    }
  }

  async function completeTask(id: string) {
    try {
      await api("/api/assistant/tasks", {
        method: "PATCH",
        body: JSON.stringify({ id }),
      });
      await refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não consegui concluir a tarefa.",
      );
    }
  }

  async function toggleNotices() {
    if (!("Notification" in window)) {
      setError(
        "Este navegador não oferece notificações. Sua lista de tarefas continua disponível.",
      );
      return;
    }
    if (notices) {
      window.localStorage.removeItem("vania-assistant-notifications-v1");
      setNotices(false);
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setError("Notificações não foram autorizadas no navegador.");
      return;
    }
    window.localStorage.setItem("vania-assistant-notifications-v1", "on");
    setNotices(true);
    window.dispatchEvent(new Event("vania-assistant-settings"));
  }

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>SEU COPILOTO DE CELEBRAÇÕES</p>
          <h1>
            Menos trabalho.
            <br />
            <span>Mais tempo para criar.</span>
          </h1>
          <p className={styles.description}>
            Converse com o Jarvis para organizar o dia e preparar suas reservas.
          </p>
        </div>
        <div className={styles.orb} aria-hidden="true">
          <Sparkles size={43} strokeWidth={1.1} />
        </div>
      </div>
      <div className={styles.layout}>
        <section className={styles.console} aria-label="Conversa com Jarvis">
          <div className={styles.consoleHeader}>
            <div className={styles.identity}>
              <span className={styles.avatar}>
                <Sparkles size={21} />
              </span>
              <div>
                <strong>Jarvis</strong>
                <span>
                  {busy
                    ? "Consultando o sistema…"
                    : "Assistente da Vânia Festas"}
                </span>
              </div>
            </div>
            <button
              className={styles.iconButton}
              onClick={() => {
                setSpeakReplies(!speakReplies);
                window.speechSynthesis?.cancel();
              }}
              type="button"
              aria-label={
                speakReplies
                  ? "Desativar respostas faladas"
                  : "Ativar respostas faladas"
              }
              aria-pressed={speakReplies}
            >
              {speakReplies ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
          </div>
          <div className={styles.messages} role="log" aria-label="Mensagens">
            {messages.length === 0 && (
              <div className={styles.welcome}>
                <span className={styles.welcomeIcon}>
                  <Sparkles size={27} />
                </span>
                <h2>Olá! O que vamos organizar?</h2>
                <p>
                  Posso consultar seus produtos, preparar uma reserva ou ajudar
                  com as tarefas do dia.
                </p>
                <div className={styles.starters}>
                  {starters.map((text) => (
                    <button
                      key={text}
                      disabled={busy}
                      onClick={() => void send(text)}
                      type="button"
                    >
                      {text}
                      <span>↗</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage
                }
              >
                <span>{message.role === "user" ? "Você" : "Jarvis"}</span>
                <p>{message.content}</p>
                {message.role === "assistant" && (
                  <button
                    className={styles.readButton}
                    onClick={() => speak(message.content)}
                    type="button"
                  >
                    <Volume2 size={13} /> Ouvir
                  </button>
                )}
              </div>
            ))}
            {busy && (
              <div className={styles.thinking} role="status">
                <LoaderCircle size={17} className="animate-spin" /> Consultando
                agenda, clientes e produtos…
              </div>
            )}
            <div ref={end} />
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {brief && !brief.aiConfigured && (
            <p className={styles.error}>
              A IA precisa ser configurada neste ambiente. Agenda e tarefas
              continuam disponíveis.
            </p>
          )}
          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <label className="sr-only" htmlFor="assistant-input">
              Seu pedido para o Jarvis
            </label>
            <textarea
              id="assistant-input"
              rows={2}
              maxLength={4000}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                listening
                  ? "Ouvindo…"
                  : "Ex.: prepare uma reserva para a Maria…"
              }
              disabled={busy}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
            />
            <div className={styles.composerBottom}>
              <p>
                {listening
                  ? "Ouvindo. Ao terminar, revise e envie."
                  : voiceAvailable
                    ? "Digite ou use o microfone. Revise antes de enviar."
                    : "Conversa por texto disponível neste navegador."}
              </p>
              <div>
                {voiceAvailable && (
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={
                      listening ? "Parar microfone" : "Ditar mensagem"
                    }
                    aria-pressed={listening}
                    onClick={dictate}
                    disabled={busy}
                  >
                    {listening ? <MicOff size={19} /> : <Mic size={19} />}
                  </button>
                )}
                <button
                  className={styles.sendButton}
                  type="submit"
                  disabled={busy || !input.trim()}
                  aria-label="Enviar mensagem"
                >
                  {busy ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          </form>
          <div className={styles.consoleFoot}>
            <span>Revise as propostas antes de salvar.</span>
            <button
              disabled={busy}
              onClick={() => {
                setMessages([]);
                setError("");
                window.speechSynthesis?.cancel();
              }}
              type="button"
            >
              Nova conversa
            </button>
          </div>
        </section>
        <aside className={styles.sidebar}>
          <section className={styles.dayCard}>
            <div className={styles.cardHeading}>
              <span>
                <CalendarDays size={17} /> Seu dia, em ordem
              </span>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => void toggleNotices()}
                aria-label={
                  notices ? "Desativar avisos" : "Ativar avisos no navegador"
                }
                aria-pressed={notices}
              >
                <Bell size={17} />
              </button>
            </div>
            <div className={styles.metrics}>
              <div>
                <strong>
                  {brief?.events.filter(
                    (event) => event.event_date === brief.today,
                  ).length ?? "—"}
                </strong>
                <span>eventos hoje</span>
              </div>
              <div>
                <strong>{brief?.tasks.length ?? "—"}</strong>
                <span>tarefas abertas</span>
              </div>
              <div>
                <strong>{brief?.pendingCount ?? "—"}</strong>
                <span>reservas pendentes</span>
              </div>
            </div>
            <p className={styles.smallNote}>
              {notices ? "Avisos ativados" : "Ative o sino para receber avisos"}{" "}
              · com a administração aberta.
            </p>
          </section>
          <section className={styles.sideCard}>
            <h2>Minhas tarefas</h2>
            <div className={styles.taskList}>
              {brief?.tasks.length === 0 && (
                <p className={styles.empty}>
                  Um respiro na agenda. Adicione seu próximo lembrete.
                </p>
              )}
              {brief?.tasks.map((task) => (
                <div key={task.id} className={styles.task}>
                  <button
                    type="button"
                    aria-label={`Concluir ${task.title}`}
                    onClick={() => void completeTask(task.id)}
                  >
                    <Check size={14} />
                  </button>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{timeFormat.format(new Date(task.due_at))}</span>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={addTask} className={styles.taskForm}>
              <label className="sr-only" htmlFor="task-title">
                Título da tarefa
              </label>
              <input
                id="task-title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                maxLength={200}
                placeholder="Novo lembrete"
                required
              />
              <label htmlFor="task-time">Data e horário de Salvador</label>
              <input
                id="task-time"
                type="datetime-local"
                value={taskTime}
                onChange={(event) => setTaskTime(event.target.value)}
                required
              />
              <button type="submit" disabled={savingTask}>
                {savingTask ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}{" "}
                Adicionar tarefa
              </button>
            </form>
          </section>
          <section className={styles.sideCard}>
            <h2>Próximos eventos</h2>
            {brief?.events.length === 0 && (
              <p className={styles.empty}>Nenhum evento nos próximos 7 dias.</p>
            )}
            {brief?.events.slice(0, 5).map((event) => (
              <Link
                className={styles.event}
                key={event.id}
                href={`/admin/reservas/${event.id}`}
              >
                <span>
                  {event.event_date.slice(8, 10)}
                  <small>{event.event_date.slice(5, 7)}</small>
                </span>
                <div>
                  <strong>
                    {event.customer_name || `Reserva #${event.id}`}
                  </strong>
                  <small>
                    {event.status === "confirmed" ? "Confirmada" : "Pendente"} ·
                    #{event.id}
                  </small>
                </div>
                <span className={styles.eventArrow}>↗</span>
              </Link>
            ))}
          </section>
        </aside>
      </div>
      {drafts.length > 0 && (
        <section
          className={styles.proposals}
          aria-label="Propostas para revisão"
        >
          <p className={styles.eyebrow}>REVISÃO FINAL</p>
          <h2>Reservas preparadas para você</h2>
          <p className={styles.description}>
            Confira os dados. Os valores e o estoque serão consultados novamente
            ao salvar.
          </p>
          <div className={styles.proposalGrid}>
            {drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onSaved={(reservationId) => {
                  setDrafts((current) =>
                    current.map((item) =>
                      item.id === draft.id
                        ? { ...item, reservation_id: reservationId }
                        : item,
                    ),
                  );
                  void refresh().catch(() => {});
                }}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function DraftCard({
  draft,
  onSaved,
}: {
  draft: ReservationDraft;
  onSaved: (id: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await api<{ reservationId: number }>(
        "/api/assistant/confirm",
        { method: "POST", body: JSON.stringify({ draftId: draft.id }) },
      );
      onSaved(result.reservationId);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não consegui salvar.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <article className={styles.draft}>
      <div className={styles.draftTop}>
        <span>
          {draft.reservation_id ? "RESERVA SALVA" : "PROPOSTA · NÃO SALVA"}
        </span>
        <Sparkles size={18} />
      </div>
      <h3>{draft.payload.customerName}</h3>
      <p>
        {draft.payload.eventDate.split("-").reverse().join("/")} ·{" "}
        {draft.payload.customerPhone}
      </p>
      <p>{draft.payload.eventAddress}</p>
      <ul>
        {draft.payload.items.map((item) => (
          <li key={item.productId}>
            <span>
              {item.quantity}× {item.name}
            </span>
            <strong>{currency.format(item.quantity * item.unitPrice)}</strong>
          </li>
        ))}
      </ul>
      <div className={styles.draftFee}>
        <span>Entrega / montagem</span>
        <strong>{currency.format(draft.payload.serviceFee)}</strong>
      </div>
      {draft.payload.notes && <p>{draft.payload.notes}</p>}
      <div className={styles.draftTotal}>
        <span>Total</span>
        <strong>{currency.format(draft.payload.total)}</strong>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {draft.reservation_id ? (
        <Link
          className={styles.confirmButton}
          href={`/admin/reservas/${draft.reservation_id}`}
        >
          <CheckCircle2 size={18} /> Abrir reserva #{draft.reservation_id}
        </Link>
      ) : (
        <>
          <button
            className={styles.confirmButton}
            type="button"
            disabled={saving}
            onClick={() => void confirm()}
          >
            {saving ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Check size={17} />
            )}{" "}
            Salvar reserva pendente
          </button>
          <p className={styles.expiry}>
            Proposta válida até {timeFormat.format(new Date(draft.expires_at))}.
            A confirmação do evento é feita na reserva.
          </p>
        </>
      )}
    </article>
  );
}
