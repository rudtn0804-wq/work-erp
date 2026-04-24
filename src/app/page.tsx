import { AppShell } from "@/app/app-shell";
import type { InitialData } from "@/app/app-shell";
import { currentYearMonth, startOfToday } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { toJsonSafe } from "@/lib/api";

export const dynamic = "force-dynamic";

async function getInitialData() {
  const today = startOfToday();
  const month = currentYearMonth();
  const from = new Date(today);
  from.setDate(from.getDate() - 14);
  const to = new Date(today);
  to.setDate(to.getDate() + 45);

  const [users, sites, schedules, payrolls, attendanceCount, todaySchedules, todayWorkLogs, notices, paintLedgerEntries] =
    await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, registrationStatus: "approved" },
        orderBy: [{ role: "asc" }, { id: "asc" }],
        select: { id: true, name: true, email: true, phone: true, role: true, dailyWage: true, registrationStatus: true },
      }),
      prisma.site.findMany({
        orderBy: [{ status: "asc" }, { id: "asc" }],
        select: { id: true, name: true, address: true, status: true },
      }),
      prisma.schedule.findMany({
        where: { workDate: { gte: from, lte: to } },
        orderBy: [{ workDate: "asc" }, { id: "asc" }],
        include: {
          site: { select: { id: true, name: true, address: true, status: true, latitude: true, longitude: true, clientName: true, clientPhone: true, memo: true } },
          workers: {
            select: {
              wage: true,
              user: { select: { id: true, name: true, email: true, phone: true, role: true, dailyWage: true, registrationStatus: true } },
            },
          },
        },
      }),
      prisma.scheduleWorker.findMany({
        where: {
          schedule: {
            workDate: {
              gte: new Date(`${month}-01`),
              lt: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1),
            },
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, role: true, dailyWage: true, registrationStatus: true } },
        },
      }),
      prisma.attendance.count({ where: { workDate: today, checkInAt: { not: null } } }),
      prisma.schedule.findMany({ where: { workDate: today }, include: { workers: true } }),
      prisma.workLog.findMany({ where: { workDate: today } }),
      prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
      prisma.paintLedgerEntry.findMany({
        where: { userId: null },
        orderBy: [{ workDate: "asc" }, { sourceRow: "asc" }, { id: "asc" }],
      }),
    ]);

  const expectedLogKeys = new Set(
    todaySchedules.flatMap((schedule) =>
      schedule.workers.map((worker) => `${schedule.id}:${worker.userId}`),
    ),
  );
  const submittedLogKeys = new Set(todayWorkLogs.map((log) => `${log.scheduleId ?? "none"}:${log.userId}`));
  const pendingWorkLogCount = [...expectedLogKeys].filter((key) => !submittedLogKeys.has(key)).length;

  // Calculate payroll dynamically from schedule worker wages for this month
  // payrolls variable is now scheduleWorker records for this month
  const scheduleWorkersThisMonth = payrolls as typeof payrolls; // typed as scheduleWorker[]
  const wageMap = new Map<string, { user: (typeof scheduleWorkersThisMonth)[0]["user"]; total: number; scheduleCount: number }>();
  for (const sw of scheduleWorkersThisMonth) {
    const uid = sw.userId.toString();
    const jobWage = sw.wage != null ? Number(sw.wage) : Number(sw.user.dailyWage);
    const existing = wageMap.get(uid);
    if (existing) {
      existing.total += jobWage;
      existing.scheduleCount++;
    } else {
      wageMap.set(uid, { user: sw.user, total: jobWage, scheduleCount: 1 });
    }
  }
  const calculatedPayrolls = [...wageMap.entries()]
    .map(([uid, v]) => ({
      id: uid,
      userId: uid,
      yearMonth: month,
      totalWorkUnit: v.scheduleCount,
      dailyWage: Number(v.user.dailyWage),
      totalAmount: v.total,
      user: v.user,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
  const monthLaborCost = calculatedPayrolls.reduce((sum, p) => sum + p.totalAmount, 0);

  return toJsonSafe({
    today,
    month,
    users,
    sites,
    schedules,
    payrolls: calculatedPayrolls,
    notices,
    paintLedgerEntries,
    attendanceCount,
    pendingWorkLogCount,
    monthLaborCost,
  }) as unknown as InitialData;
}

export default async function Home() {
  const initialData = await getInitialData();

  return <AppShell initialData={initialData} />;
}
