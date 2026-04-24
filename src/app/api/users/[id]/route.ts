import bcrypt from "bcryptjs";
import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { approveSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return routeGuard(async () => {
    const { id } = await context.params;
    const body = approveSchema.parse(await request.json());

    if (body.action === "approve") {
      const user = await prisma.user.update({
        where: { id: BigInt(id) },
        data: { registrationStatus: "approved", isActive: true, rejectionReason: null },
        select: { id: true, name: true, registrationStatus: true },
      });
      return ok(toJsonSafe(user));
    }

    const user = await prisma.user.update({
      where: { id: BigInt(id) },
      data: {
        registrationStatus: "rejected",
        isActive: false,
        rejectionReason: body.rejectionReason ?? "관리자에 의해 거절되었습니다.",
      },
      select: { id: true, name: true, registrationStatus: true },
    });
    return ok(toJsonSafe(user));
  });
}

export async function PUT(request: Request, context: RouteContext) {
  return routeGuard(async () => {
    const { id } = await context.params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.email !== undefined) data.email = body.email || null;
    if (body.role !== undefined) data.role = body.role;
    if (body.dailyWage !== undefined) data.dailyWage = body.dailyWage;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.password !== undefined) data.passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.update({
      where: { id: BigInt(id) },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, dailyWage: true, isActive: true },
    });

    return ok(toJsonSafe(user));
  });
}
