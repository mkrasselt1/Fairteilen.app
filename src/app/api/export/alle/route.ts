import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { csvResponse, expensesToCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Nicht angemeldet", { status: 401 });

  const expenses = await prisma.expense.findMany({
    where: { deletedAt: null, shares: { some: { userId: user.id } } },
    include: {
      group: { select: { name: true } },
      shares: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { date: "desc" },
  });

  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(expensesToCsv(expenses), `fairteilen-export-${date}.csv`);
}
