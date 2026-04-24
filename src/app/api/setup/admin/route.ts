import bcrypt from "bcryptjs";
import { fail, ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { bootstrapAdminSchema } from "@/lib/validators";

export async function POST(request: Request) {
  return routeGuard(async () => {
    const setupToken = process.env.ADMIN_SETUP_TOKEN;
    if (!setupToken) {
      return fail("ADMIN_SETUP_TOKEN 환경변수가 설정되지 않았습니다.", 500);
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token !== setupToken) {
      return fail("설정 토큰이 올바르지 않습니다.", 401);
    }

    const adminExists = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true, email: true, name: true },
    });

    if (adminExists) {
      return fail("이미 관리자 계정이 존재합니다.", 409, toJsonSafe(adminExists));
    }

    const body = bootstrapAdminSchema.parse(await request.json());
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });

    if (existingUser) {
      return fail("이미 사용 중인 이메일입니다.", 409);
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const admin = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash,
        role: "admin",
        dailyWage: 0,
        isActive: true,
        registrationStatus: "approved",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        registrationStatus: true,
      },
    });

    return ok(toJsonSafe(admin), { status: 201 });
  });
}
