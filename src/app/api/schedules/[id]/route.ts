import { z } from "zod";
import { fail, ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const updateScheduleSchema = z.object({
  status: z.enum(["planned", "in_progress", "completed", "paused"]).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  return routeGuard(async () => {
    const { id } = await context.params;
    const body = updateScheduleSchema.parse(await request.json());

    const schedule = await prisma.schedule.update({
      where: { id: BigInt(id) },
      data: body,
      include: { site: true, workers: { include: { user: true } } },
    });

    return ok(toJsonSafe(schedule));
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  return routeGuard(async () => {
    const { id } = await context.params;
    const schedule = await prisma.schedule.findUnique({ where: { id: BigInt(id) } });

    if (!schedule) {
      return fail("삭제할 일정을 찾을 수 없습니다.", 404);
    }

    await prisma.schedule.delete({ where: { id: BigInt(id) } });
    return ok({ id });
  });
}
