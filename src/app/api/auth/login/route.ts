import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { fail, ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return fail("이메일 또는 비밀번호가 올바르지 않습니다.", 401);
    }

    const token = jwt.sign(
      { sub: user.id.toString(), role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    return ok(toJsonSafe({ token, user: { id: user.id, name: user.name, role: user.role } }));
  });
}
