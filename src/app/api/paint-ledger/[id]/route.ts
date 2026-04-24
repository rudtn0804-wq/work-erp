import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { paintLedgerSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  return routeGuard(async () => {
    const { id } = await context.params;
    const body = paintLedgerSchema.partial().parse(await request.json());
    const entry = await prisma.paintLedgerEntry.update({
      where: { id: BigInt(id) },
      data: {
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
        isDayOff: body.isDayOff,
      },
    });

    return ok(toJsonSafe(entry));
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return routeGuard(async () => {
    const { id } = await context.params;
    await prisma.paintLedgerEntry.delete({ where: { id: BigInt(id) } });
    return ok({ id });
  });
}
