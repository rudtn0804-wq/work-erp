import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { currentYearMonth, startOfToday } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return routeGuard(async () => {
    const today = startOfToday();
    const yearMonth = currentYearMonth();

    const [
      todayScheduleCount,
      activeSiteCount,
      todayAttendanceCount,
      todaySchedules,
      todayWorkLogs,
      payrolls,
      recentPhotos,
    ] = await Promise.all([
      prisma.schedule.count({ where: { workDate: today } }),
      prisma.site.count({ where: { status: "in_progress" } }),
      prisma.attendance.count({ where: { workDate: today, checkInAt: { not: null } } }),
      prisma.schedule.findMany({ where: { workDate: today }, include: { workers: true } }),
      prisma.workLog.findMany({ where: { workDate: today } }),
      prisma.payroll.findMany({ where: { yearMonth } }),
      prisma.workLogPhoto.findMany({
        orderBy: { uploadedAt: "desc" },
        take: 10,
        include: { workLog: { include: { site: true, user: true } } },
      }),
    ]);

    const expectedLogs = new Set(
      todaySchedules.flatMap((schedule) =>
        schedule.workers.map((worker) => `${schedule.id}:${worker.userId}`),
      ),
    );
    const submittedLogs = new Set(
      todayWorkLogs.map((log) => `${log.scheduleId ?? "none"}:${log.userId}`),
    );
    const pendingWorkLogCount = [...expectedLogs].filter((key) => !submittedLogs.has(key)).length;
    const monthLaborCost = payrolls.reduce((sum, payroll) => sum + payroll.totalAmount.toNumber(), 0);

    return ok(
      toJsonSafe({
        todayScheduleCount,
        activeSiteCount,
        todayAttendanceCount,
        pendingWorkLogCount,
        monthLaborCost,
        recentPhotos,
      }),
    );
  });
}
