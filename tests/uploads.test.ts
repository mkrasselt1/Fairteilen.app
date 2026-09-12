/** Belege: Typerkennung an den ersten Bytes, Speichern und Löschen. */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), "fairteilen-belege-"));

const { detectKind, storeUpload, readUpload, deleteUpload, UploadError, uploadDir, formatBytes, MAX_UPLOAD_BYTES } =
  await import("../src/lib/uploads.ts");

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20, 2)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(20, 3)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(20, 4)]);
const HEIC = Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("heic"), Buffer.alloc(20, 5)]);
const HTML = Buffer.from("<!doctype html><script>alert(1)</script>");

function asFile(buffer: Buffer, name: string, type = "application/octet-stream") {
  return new File([new Uint8Array(buffer)], name, { type });
}

test("erlaubte Formate werden erkannt", () => {
  assert.equal(detectKind(JPEG)?.mimeType, "image/jpeg");
  assert.equal(detectKind(PNG)?.mimeType, "image/png");
  assert.equal(detectKind(WEBP)?.mimeType, "image/webp");
  assert.equal(detectKind(PDF)?.mimeType, "application/pdf");
});

test("andere Inhalte werden abgelehnt", () => {
  assert.equal(detectKind(HTML), null);
  assert.equal(detectKind(HEIC), null);
  assert.equal(detectKind(Buffer.alloc(4)), null);
});

test("der mitgeschickte Content-Type entscheidet nicht", async () => {
  // Eine als Bild ausgegebene HTML-Datei darf nicht durchrutschen.
  await assert.rejects(() => storeUpload(asFile(HTML, "böse.jpg", "image/jpeg")), UploadError);
});

test("HEIC bekommt eine verständliche Meldung", async () => {
  await assert.rejects(() => storeUpload(asFile(HEIC, "IMG_0001.heic", "image/heic")), /iPhone/);
});

test("leere und zu große Dateien werden abgelehnt", async () => {
  await assert.rejects(() => storeUpload(asFile(Buffer.alloc(0), "leer.jpg")), /leer/);
  const big = Buffer.concat([JPEG, Buffer.alloc(MAX_UPLOAD_BYTES)]);
  await assert.rejects(() => storeUpload(asFile(big, "riesig.jpg")), /größer/);
});

test("speichern, lesen und löschen", async () => {
  const stored = await storeUpload(asFile(JPEG, "Kassenbon Rewe.jpg", "image/jpeg"));
  assert.match(stored.storedName, /^[a-f0-9]{32}\.jpg$/);
  assert.equal(stored.mimeType, "image/jpeg");
  assert.equal(stored.originalName, "Kassenbon Rewe.jpg");
  assert.equal(stored.sizeBytes, JPEG.length);

  const path = join(uploadDir(), stored.storedName);
  assert.ok(existsSync(path));
  assert.deepEqual(readFileSync(path), JPEG);
  assert.deepEqual(await readUpload(stored.storedName), JPEG);

  await deleteUpload(stored.storedName);
  assert.ok(!existsSync(path));
});

test("Dateinamen aus der Datenbank werden streng geprüft", async () => {
  // Kein Ausbrechen aus dem Verzeichnis, auch wenn ein Name manipuliert wurde.
  for (const name of ["../../etc/passwd", "abc.jpg", "/etc/passwd", "a".repeat(32) + ".exe"]) {
    await assert.rejects(() => readUpload(name), UploadError);
  }
  await deleteUpload("../../etc/passwd"); // darf nichts tun und nicht werfen
});

test("Dateigrößen werden lesbar angezeigt", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(2048), "2 KB");
  assert.equal(formatBytes(3 * 1024 * 1024), "3.0 MB");
});
