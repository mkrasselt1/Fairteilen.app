import "server-only";
import crypto from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fill } from "./i18n.ts";

/**
 * Belege liegen als Dateien auf der Platte – standardmäßig im Ordner `uploads`
 * im Anwendungsstamm. Der liegt außerhalb des Dokumentenstamms und ist damit
 * nicht direkt über das Web erreichbar; ausgeliefert wird nur über eine Route,
 * die die Berechtigung prüft.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type UploadKind = { mimeType: string; extension: string; label: string };

const TYPES: UploadKind[] = [
  { mimeType: "image/jpeg", extension: "jpg", label: "JPEG-Bild" },
  { mimeType: "image/png", extension: "png", label: "PNG-Bild" },
  { mimeType: "image/webp", extension: "webp", label: "WebP-Bild" },
  { mimeType: "application/pdf", extension: "pdf", label: "PDF" },
];

export const ACCEPT_ATTRIBUTE = "image/jpeg,image/png,image/webp,application/pdf";

const STORED_NAME_PATTERN = /^[a-f0-9]{32}\.(jpg|png|webp|pdf)$/;

/** Wie SplitError: Vorlage und Werte bleiben erhalten, damit übersetzt werden kann. */
export class UploadError extends Error {
  readonly template: string;
  readonly params: Record<string, string | number>;

  constructor(template: string, params: Record<string, string | number> = {}) {
    super(fill(template, params));
    this.template = template;
    this.params = params;
  }
}

export function uploadDir(): string {
  return resolve(process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads"));
}

/**
 * Erkennt den Dateityp an den ersten Bytes statt am mitgeschickten Content-Type –
 * der lässt sich beliebig fälschen.
 */
export function detectKind(buffer: Buffer): UploadKind | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return TYPES[0];
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return TYPES[1];
  if (buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") {
    return TYPES[2];
  }
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return TYPES[3];
  return null;
}

/** HEIC/HEIF erkennen, um eine verständliche Meldung geben zu können. */
function looksLikeHeic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.subarray(4, 8).toString("latin1") !== "ftyp") return false;
  return ["heic", "heix", "hevc", "heim", "mif1", "msf1"].includes(buffer.subarray(8, 12).toString("latin1"));
}

export type StoredUpload = {
  storedName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export type PreparedUpload = StoredUpload & { buffer: Buffer };

/**
 * Prüft eine Datei, ohne sie zu schreiben. So lässt sich erst der ganze Stapel
 * prüfen und dann geschlossen speichern – halb hochgeladene Belege gibt es nicht.
 */
export async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (file.size === 0) throw new UploadError("Die Datei ist leer.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("Die Datei ist größer als {grenze} MB.", {
      grenze: Math.round(MAX_UPLOAD_BYTES / 1024 / 1024),
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectKind(buffer);
  if (!kind) {
    if (looksLikeHeic(buffer)) {
      throw new UploadError(
        "HEIC-Bilder von iPhones können nicht überall angezeigt werden. Bitte das Foto über die Kamera in der App aufnehmen – dabei wird es automatisch umgewandelt.",
      );
    }
    throw new UploadError("Nur JPEG, PNG, WebP und PDF sind möglich.");
  }

  return {
    storedName: `${crypto.randomBytes(16).toString("hex")}.${kind.extension}`,
    originalName: (file.name || `beleg.${kind.extension}`).slice(0, 150),
    mimeType: kind.mimeType,
    sizeBytes: buffer.length,
    buffer,
  };
}

export async function writeUpload(prepared: PreparedUpload): Promise<StoredUpload> {
  const directory = uploadDir();
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, prepared.storedName), prepared.buffer, { mode: 0o600 });

  const { buffer: _buffer, ...meta } = prepared;
  return meta;
}

export async function storeUpload(file: File): Promise<StoredUpload> {
  return writeUpload(await prepareUpload(file));
}

export async function readUpload(storedName: string): Promise<Buffer> {
  if (!STORED_NAME_PATTERN.test(storedName)) throw new UploadError("Unbekannter Beleg.");
  return readFile(join(uploadDir(), storedName));
}

export async function deleteUpload(storedName: string): Promise<void> {
  if (!STORED_NAME_PATTERN.test(storedName)) return;
  await unlink(join(uploadDir(), storedName)).catch(() => undefined);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
