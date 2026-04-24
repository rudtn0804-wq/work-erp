import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { startOfToday } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { attendanceSchema } from "@/lib/validators";

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = attendanceSchema.parse(await request.json());
    const workDate = body.workDate ? new Date(body.workDate) : startOfToday();
    const attendance = await prisma.attendance.upsert({
      where: { userId_workDate: { userId: body.userId, workDate } },
      update: { checkInAt: new Date(), siteId: body.siteId, status: "present" },
      create: {
        userId: body.userId,
        siteId: body.siteId,
        workDate,
        checkInAt: new Date(),
        status: "present",
      },
    });

    return ok(toJsonSafe(attendance));
  });
}
