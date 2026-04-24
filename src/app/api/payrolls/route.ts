import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { currentYearMonth } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  return routeGuard(async () => {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get("yearMonth") ?? currentYearMonth();
    const payrolls = await prisma.payroll.findMany({
      where: { yearMonth },
      orderBy: { totalAmount: "desc" },
      include: { user: true },
    });

    return ok(toJsonSafe(payrolls));
  });
}
