import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { siteUpdateSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return routeGuard(async () => {
    const { id } = await context.params;
    const body = siteUpdateSchema.parse(await request.json());

    const site = await prisma.site.update({
      where: { id: BigInt(id) },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.clientName !== undefined && { clientName: body.clientName }),
        ...(body.clientPhone !== undefined && { clientPhone: body.clientPhone }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.latitude !== undefined && { latitude: body.latitude }),
        ...(body.longitude !== undefined && { longitude: body.longitude }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.memo !== undefined && { memo: body.memo }),
      },
    });

    return ok(toJsonSafe(site));
  });
}
