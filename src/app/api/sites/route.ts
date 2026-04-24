import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { siteSchema } from "@/lib/validators";

export async function GET() {
  return routeGuard(async () => {
    const sites = await prisma.site.findMany({
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      include: { schedules: { take: 3, orderBy: { workDate: "desc" } } },
    });

    return ok(toJsonSafe(sites));
  });
}

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = siteSchema.parse(await request.json());
    const site = await prisma.site.create({
      data: {
        name: body.name,
        clientName: body.clientName,
        clientPhone: body.clientPhone,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        status: body.status,
        memo: body.memo,
        createdById: body.createdById,
      },
    });

    return ok(toJsonSafe(site), { status: 201 });
  });
}
