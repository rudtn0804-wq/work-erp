import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { scheduleSchema } from "@/lib/validators";

function parseTime(value?: string) {
  if (!value) return undefined;
  return new Date(`1970-01-01T${value.length === 5 ? `${value}:00` : value}Z`);
}

export async function GET(request: Request) {
  return routeGuard(async () => {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const schedules = await prisma.schedule.findMany({
      where: {
        workDate: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      orderBy: [{ workDate: "asc" }, { id: "asc" }],
      include: { site: true, workers: { include: { user: true } } },
    });

    return ok(toJsonSafe(schedules));
  });
}

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = scheduleSchema.parse(await request.json());
    const workDate = new Date(body.workDate);
    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.schedule.create({
        data: {
          siteId: body.siteId,
          title: body.title,
          description: body.description,
          workLocation: body.workLocation,
          workType: body.workType,
          workDate,
          startTime: parseTime(body.startTime),
          endTime: parseTime(body.endTime),
          estimatedWorkUnit: body.estimatedWorkUnit ?? 1,
          totalAmount: body.totalAmount ?? null,
          status: body.status,
          createdById: body.createdById,
          workers: body.workerIds?.length
            ? {
                create: body.workerIds.map((userId) => ({
                  userId,
                  wage: body.workerWages?.[userId.toString()] ?? null,
                })),
              }
            : undefined,
        },
        include: { site: true, workers: { include: { user: true } } },
      });

      const siteParts = [
        schedule.site.name,
        schedule.site.address,
        body.workLocation ? `작업위치: ${body.workLocation}` : undefined,
      ].filter(Boolean);

      const paintLedgerEntry = await tx.paintLedgerEntry.create({
        data: {
          userId: body.createdByRole === "worker" ? (body.createdById ?? null) : null,
          workDate,
          siteAddress: siteParts.join(" / "),
          materialSpec: body.workType ?? undefined,
          amount: body.totalAmount ?? 0,
          paymentStatus: null,
          memo: `현장일정 자동등록: ${body.title}`,
          suppliedMaterials: body.description,
          ownerCategory: "mine",
          isDayOff: false,
        },
      });

      return { schedule, paintLedgerEntry };
    });

    return ok(toJsonSafe(result), { status: 201 });
  });
}
