import { fail, ok, routeGuard, toJsonSafe } from "@/lib/api";
import { startOfToday } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { attendanceSchema } from "@/lib/validators";

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = attendanceSchema.parse(await request.json());
    const workDate = body.workDate ? new Date(body.workDate) : startOfToday();
    const attendance = await prisma.attendance.findUnique({
      where: { userId_workDate: { userId: body.userId, workDate } },
    });

    if (!attendance) {
      return fail("출근 기록이 없어 퇴근 처리할 수 없습니다.", 404);
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOutAt: new Date() },
    });

    return ok(toJsonSafe(updated));
  });
}
