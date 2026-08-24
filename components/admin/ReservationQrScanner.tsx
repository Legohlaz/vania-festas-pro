"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, QrCode, ScanLine, XCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Stage = "preparing" | "delivered" | "returned";
type Item = { id: number; product_id: number; quantity: number; product_name: string; product_slug: string | null };
type Scan = { reservation_item_id: number; stage: Stage; checked_quantity: number };

type DetectorResult = { rawValue: string };
type Detector = { detect(source: HTMLVideoElement): Promise<DetectorResult[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

declare global { interface Window { BarcodeDetector?: DetectorConstructor; } }

const labels: Record<Stage, string> = { preparing: "Separação", delivered: "Entrega / montagem", returned: "Retorno" };

function slugFromQr(rawValue: string) {
  try {
    const url = new URL(rawValue);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "catalogo" ? parts[1] ?? null : null;
  } catch { return null; }
}

export function ReservationQrScanner({ reservationId, items, initialStage }: { reservationId: number; items: Item[]; initialStage: Stage }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const [stage, setStage] = useState<Stage>(initialStage);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [message, setMessage] = useState("Aponte a câmera para a etiqueta ou cole o link do QR Code.");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [scans, setScans] = useState<Scan[]>([]);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);

  const loadScans = useCallback(async () => {
    const { data } = await createClient().from("reservation_item_qr_scans").select("reservation_item_id,stage,checked_quantity").eq("reservation_id", reservationId);
    setScans((data ?? []) as Scan[]);
  }, [reservationId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadScans(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadScans]);
  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function confirmItem(item: Item) {
    setSavingItemId(item.id);
    const { error } = await createClient().from("reservation_item_qr_scans").upsert({ reservation_id: reservationId, reservation_item_id: item.id, product_id: item.product_id, stage, checked_quantity: item.quantity, checked_at: new Date().toISOString() }, { onConflict: "reservation_item_id,stage" });
    setSavingItemId(null);
    if (error) {
      setMessage(`Não foi possível salvar a conferência: ${error.message}`);
      setMessageTone("error");
      return;
    }
    setScans((current) => [...current.filter((scan) => !(scan.reservation_item_id === item.id && scan.stage === stage)), { reservation_item_id: item.id, stage, checked_quantity: item.quantity }]);
    setMessage(`${item.product_name}: ${item.quantity} unidade(s) confirmada(s) em ${labels[stage].toLocaleLowerCase("pt-BR")}.`);
    setMessageTone("success");
  }

  async function handleQr(rawValue: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    const slug = slugFromQr(rawValue);
    const item = items.find((candidate) => candidate.product_slug === slug);
    if (!slug || !item) {
      setMessage("Este QR Code não pertence a um produto desta reserva.");
      setMessageTone("error");
      busyRef.current = false;
      return;
    }
    await confirmItem(item);
    busyRef.current = false;
  }

  async function startCamera() {
    if (!window.BarcodeDetector) {
      setMessage("A leitura por câmera não é compatível com este navegador. Use o campo para colar o link do QR Code.");
      setMessageTone("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      timerRef.current = window.setInterval(async () => {
        if (!videoRef.current || busyRef.current) return;
        const codes = await detector.detect(videoRef.current);
        if (codes[0]?.rawValue) await handleQr(codes[0].rawValue);
      }, 700);
      setCameraOpen(true);
      setMessage("Câmera ligada. Aponte para a etiqueta do produto.");
      setMessageTone("neutral");
    } catch {
      setMessage("Não foi possível acessar a câmera. Verifique a permissão do navegador ou cole o link abaixo.");
      setMessageTone("error");
    }
  }

  function isChecked(itemId: number) { return scans.some((scan) => scan.reservation_item_id === itemId && scan.stage === stage); }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 shadow-sm">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2 text-sky-700"><ScanLine className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Conferência por QR Code</h2><p className="mt-1 text-sm text-slate-500">Escaneie o QR de cada tipo de produto para confirmar a quantidade da reserva.</p></div></div>
      <div className="mt-4 grid grid-cols-3 gap-2">{(Object.keys(labels) as Stage[]).map((value) => <button key={value} type="button" onClick={() => setStage(value)} className={`rounded-xl px-2 py-2 text-xs font-bold ${stage === value ? "bg-emerald-800 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{labels[value]}</button>)}</div>
      <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-sky-100">
        {cameraOpen ? <><video ref={videoRef} muted playsInline className="aspect-video w-full rounded-lg bg-slate-900 object-cover" /><button type="button" onClick={stopCamera} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700"><XCircle size={16} /> Desligar câmera</button></> : <button type="button" onClick={() => void startCamera()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-700 text-sm font-bold text-white hover:bg-sky-800"><Camera size={17} /> Ler QR com a câmera</button>}
        <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void handleQr(manualCode); }}><input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Cole o link do QR" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-emerald-500" /><button className="rounded-lg border border-emerald-700 px-3 text-xs font-bold text-emerald-800">Ler</button></form>
      </div>
      <p className={`mt-3 rounded-lg p-3 text-xs leading-5 ${messageTone === "error" ? "bg-red-50 text-red-700" : messageTone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-white text-slate-600"}`}>{message}</p>
      <div className="mt-4 space-y-2">{items.map((item) => { const checked = isChecked(item.id); return <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-slate-100"><span className="min-w-0"><strong className="block truncate text-sm text-slate-800">{item.product_name}</strong><span className="text-xs text-slate-500">{item.quantity} unidade(s)</span></span>{checked ? <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={15} /> Conferido</span> : <button type="button" disabled={savingItemId === item.id} onClick={() => void confirmItem(item)} className="shrink-0 rounded-lg border border-sky-200 px-2.5 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-50">{savingItemId === item.id ? "Salvando..." : "Confirmar"}</button>}</div>; })}</div>
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><QrCode size={14} /> A câmera funciona em HTTPS (como o site publicado) e em localhost.</p>
    </section>
  );
}
