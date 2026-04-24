import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { paintLedgerSchema } from "@/lib/validators";

export async function GET(request: Request) {
  return routeGuard(async () => {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get("yearMonth");
    const userIdParam = searchParams.get("userId");
    const scope = searchParams.get("scope");

    const where: Record<string, unknown> = {};
    if (yearMonth) {
      where.workDate = {
        gte: new Date(`${yearMonth}-01`),
        lt: new Date(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(5, 7)), 1),
      };
    }
    if (scope === "manager") {
      where.userId = null;
    } else if (userIdParam) {
      where.userId = BigInt(userIdParam);
    }

    const entries = await prisma.paintLedgerEntry.findMany({
      where,
      orderBy: [{ workDate: "asc" }, { sourceRow: "asc" }, { id: "asc" }],
    });

    return ok(toJsonSafe(entries));
  });
}

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = paintLedgerSchema.parse(await request.json());
    const entry = await prisma.paintLedgerEntry.create({
      data: {
        userId: body.userId ?? undefined,
        workDate: body.workDate ? new Date(body.workDate) : undefined,
        siteAddress: body.siteAddress,
        materialSpec: body.materialSpec,
        amount: body.amount,
        paymentStatus: body.paymentStatus,
        memo: body.memo,
        suppliedMaterials: body.suppliedMaterials,
        laborCost: body.laborCost,
        fuelCost: body.fuelCost,
        materialCost: body.materialCost,
        ownerCategory: body.ownerCategory,
        isDayOff: body.isDayOff ?? false,
      },
    });

    return ok(toJsonSafe(entry), { status: 201 });
  });
}
