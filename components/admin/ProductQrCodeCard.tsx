"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, Copy, Download, Printer, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type ProductQrCodeCardProps = {
  productId: string | number;
  productName: string;
  productSlug: string;
};

function productCode(productId: string | number) {
  return `VF-${String(productId).padStart(5, "0")}`;
}

export default function ProductQrCodeCard({
  productId,
  productName,
  productSlug,
}: ProductQrCodeCardProps) {
  const siteUrl = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );
  const [copied, setCopied] = useState(false);
  const qrElementId = `product-qr-${productId}`;
  const code = productCode(productId);

  const productUrl = useMemo(() => {
    if (!siteUrl || !productSlug) return "";

    return `${siteUrl}/catalogo/${productSlug}`;
  }, [productSlug, siteUrl]);

  async function copyLink() {
    if (!productUrl) return;

    await navigator.clipboard.writeText(productUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function getQrMarkup() {
    return document.getElementById(qrElementId)?.outerHTML ?? "";
  }

  function downloadQrCode() {
    const markup = getQrMarkup();
    if (!markup) return;

    const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${productSlug || code.toLowerCase()}-qr-code.svg`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  function printLabel() {
    const markup = getQrMarkup();
    if (!markup) return;

    const printWindow = window.open("", "_blank", "width=480,height=640");
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html>
      <html lang="pt-BR">
        <head>
          <title>Etiqueta ${productName}</title>
          <style>
            @page { size: 70mm 55mm; margin: 4mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; color: #10223a; }
            .label { width: 62mm; min-height: 47mm; border: 1px solid #d5dde7; border-radius: 4mm; padding: 4mm; display: grid; grid-template-columns: 1fr 29mm; gap: 3mm; align-items: center; }
            .name { font-size: 14px; font-weight: 700; line-height: 1.2; }
            .code { margin-top: 3mm; color: #006d4e; font-size: 11px; font-weight: 700; letter-spacing: .08em; }
            .hint { margin-top: 2mm; color: #5b6b82; font-size: 9px; line-height: 1.3; }
            svg { width: 28mm; height: 28mm; }
          </style>
        </head>
        <body>
          <section class="label">
            <div>
              <div class="name">${productName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              <div class="code">${code}</div>
              <div class="hint">Aponte a câmera para ver os detalhes do produto.</div>
            </div>
            <div>${markup}</div>
          </section>
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  }

  return (
    <section
      id="qr-code"
      className="rounded-2xl border border-emerald-200 bg-emerald-50/60"
      style={{ marginTop: "32px", padding: "24px" }}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">
            <QrCode size={18} />
            Etiqueta do produto
          </div>
          <h2 className="mt-2 text-xl font-black text-gray-900">QR Code para consulta rápida</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
            Imprima e cole esta etiqueta no item. Ao escanear, o celular abre a página pública do produto.
          </p>
        </div>

        <div className="flex min-w-[156px] flex-col items-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-emerald-100">
          {productUrl ? (
            <QRCodeSVG
              id={qrElementId}
              value={productUrl}
              size={128}
              level="M"
              includeMargin
              bgColor="#ffffff"
              fgColor="#064e3b"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center text-emerald-700">
              <QrCode size={52} />
            </div>
          )}
          <span className="mt-2 text-xs font-black tracking-[0.12em] text-emerald-800">{code}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-emerald-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="break-all text-xs text-gray-500">
          {productUrl || "Preparando link do produto..."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyLink} disabled={!productUrl} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Link copiado" : "Copiar link"}
          </button>
          <button type="button" onClick={downloadQrCode} disabled={!productUrl} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">
            <Download size={16} /> Baixar QR
          </button>
          <button type="button" onClick={printLabel} disabled={!productUrl} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">
            <Printer size={16} /> Imprimir etiqueta
          </button>
        </div>
      </div>
    </section>
  );
}
