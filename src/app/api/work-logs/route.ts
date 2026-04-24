import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { workLogSchema } from "@/lib/validators";

export async function GET() {
  return routeGuard(async () => {
    const logs = await prisma.workLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { site: true, user: true, photos: true },
    });

    return ok(toJsonSafe(logs));
  });
}

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = workLogSchema.parse(await request.json());
    const log = await prisma.workLog.create({
      data: {
        siteId: body.siteId,
        userId: body.userId,
        scheduleId: body.scheduleId,
        workDate: new Date(body.workDate),
        content: body.content,
        issues: body.issues,
        materialRequest: body.materialRequest,
        photos: body.photos?.length
          ? { create: body.photos.map((imageUrl) => ({ imageUrl })) }
          : undefined,
      },
      include: { photos: true, site: true, user: true },
    });

    return ok(toJsonSafe(log), { status: 201 });
  });
}
