import bcrypt from "bcryptjs";
import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/lib/validators";

export async function GET() {
  return routeGuard(async () => {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ role: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        dailyWage: true,
      },
    });

    return ok(toJsonSafe(users));
  });
}

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = userSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash("password1234", 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email,
        role: body.role,
        dailyWage: body.dailyWage ?? 0,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        dailyWage: true,
      },
    });

    return ok(toJsonSafe(user), { status: 201 });
  });
}
