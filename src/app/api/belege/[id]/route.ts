import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Liefert einen Beleg aus – nur an Personen, die die Ausgabe sehen dürfen. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });

  const { id } = await params;
  const attachment = await prisma.attachment.findFirst({
    where: {
      id,
      expense: {
        OR: [
          { shares: { some: { userId: user.id } } },
          { group: { members: { some: { userId: user.id } } } },
          { createdById: user.id },
        ],
      },
    },
  });
  if (!attachment) return new Response("Nicht gefunden", { status: 404 });

  let data: Buffer;
  try {
    data = await readUpload(attachment.storedName);
  } catch {
    return new Response("Die Datei ist nicht mehr vorhanden.", { status: 410 });
  }

  const download = new URL(request.url).searchParams.has("download");
  const filename = attachment.originalName.replace(/[^\w.\-() ]+/g, "_");

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      // Hochgeladene Dateien strikt behandeln: kein Raten des Typs, keine
      // Einbettung fremder Inhalte.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; object-src 'none'; sandbox",
      // Belege ändern sich nicht; privat zwischenspeichern ist in Ordnung.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
