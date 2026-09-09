import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { csvResponse, expensesToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });

  const { id } = await params;
  const group = await prisma.group.findFirst({
    where: { id, members: { some: { userId: user.id } } },
    select: { id: true, name: true },
  });
  if (!group) return new Response("Nicht gefunden", { status: 404 });

  const expenses = await prisma.expense.findMany({
    where: { groupId: group.id, deletedAt: null },
    include: {
      group: { select: { name: true } },
      shares: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { date: "desc" },
  });

  const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gruppe";
  return csvResponse(expensesToCsv(expenses), `fairteilen-${slug}.csv`);
}
