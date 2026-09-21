"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n";

/**
 * Belege aufnehmen oder auswählen. Bilder werden noch im Browser verkleinert –
 * das spart Übertragung und Speicherplatz und wandelt nebenbei HEIC-Aufnahmen
 * von iPhones in JPEG um. PDFs bleiben unverändert.
 */

const MAX_EDGE = 2000;
const QUALITY = 0.82;
const MAX_BYTES = 10 * 1024 * 1024;

type Prepared = { file: File; previewUrl: string | null; originalSize: number; previewBroken?: boolean };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function shrinkImage(file: File): Promise<File> {
  // createImageBitmap dreht das Bild anhand der EXIF-Angabe richtig herum.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function ReceiptPicker({
  name = "beleg",
  label,
  hint,
}: {
  name?: string;
  label?: string;
  hint?: string;
}) {
  const t = useT();
  const [items, setItems] = useState<Prepared[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Die vorbereiteten Dateien in das echte Formularfeld übertragen.
  useEffect(() => {
    if (!hiddenRef.current) return;
    const transfer = new DataTransfer();
    for (const item of items) transfer.items.add(item.file);
    hiddenRef.current.files = transfer.files;
  }, [items]);

  useEffect(() => {
    return () => {
      for (const item of items) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    };
    // Aufräumen nur beim Verlassen der Seite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setError(null);
    const prepared: Prepared[] = [];
    const problems: string[] = [];

    for (const original of Array.from(fileList)) {
      let file = original;
      if (original.type.startsWith("image/")) {
        try {
          file = await shrinkImage(original);
        } catch {
          // Kann der Browser das Format nicht lesen (etwa HEIC), unverändert
          // versuchen – der Server meldet dann verständlich zurück.
          file = original;
        }
      }
      if (file.size > MAX_BYTES) {
        problems.push(
          t("{datei} ist mit {groesse} zu groß (höchstens 10 MB).", {
            datei: original.name,
            groesse: formatBytes(file.size),
          }),
        );
        continue;
      }
      prepared.push({
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        originalSize: original.size,
      });
    }

    setItems((current) => [...current, ...prepared]);
    if (problems.length > 0) setError(problems.join(" "));
    setBusy(false);
    if (cameraRef.current) cameraRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
  }

  function remove(index: number) {
    setItems((current) => {
      const item = current[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  return (
    <div>
      <span className="label">{label ?? t("Belege")}</span>

      {/* Das eigentliche Formularfeld – gefüllt aus den vorbereiteten Dateien. */}
      <input ref={hiddenRef} type="file" name={name} multiple className="hidden" tabIndex={-1} aria-hidden />

      {/* capture öffnet auf dem Handy direkt die Kamera. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="btn-secondary"
          disabled={busy}
        >
          {t("📷 Foto aufnehmen")}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary" disabled={busy}>
          {t("📎 Datei wählen")}
        </button>
      </div>

      {busy && <p className="hint mt-2">{t("Bild wird vorbereitet …")}</p>}
      {error && <p className="negative mt-2 text-sm">{error}</p>}
      {items.length === 0 && !busy && (
        <p className="hint mt-2">
          {hint ?? t("Kassenbon oder Rechnung – wird beim Speichern mit hochgeladen.")}
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {items.map((item, index) => (
            <li key={`${item.file.name}-${index}`} className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                {item.previewUrl && !item.previewBroken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-full w-full object-cover"
                    onError={() =>
                      setItems((current) =>
                        current.map((entry, i) => (i === index ? { ...entry, previewBroken: true } : entry)),
                      )
                    }
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-3xl" aria-hidden>
                    📄
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white shadow dark:bg-slate-100 dark:text-slate-900"
                aria-label={t("{datei} entfernen", { datei: item.file.name })}
              >
                ✕
              </button>
              <p className="mt-1 w-24 truncate text-[11px] text-slate-500 dark:text-slate-400" title={item.file.name}>
                {formatBytes(item.file.size)}
                {item.file.size < item.originalSize &&
                  ` ${t("statt {vorher}", { vorher: formatBytes(item.originalSize) })}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
