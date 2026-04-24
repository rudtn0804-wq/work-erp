import bcrypt from "bcryptjs";
import { fail, ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = registerSchema.parse(await request.json());

    const existing = body.email
      ? await prisma.user.findUnique({ where: { email: body.email } })
      : null;
    if (existing) return fail("이미 사용 중인 이메일입니다.", 409);

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        phone: body.phone,
        address: body.address,
        email: body.email,
        passwordHash,
        role: "worker",
        profilePhoto: body.profilePhoto,
        faceDescriptor: body.faceDescriptor ? JSON.stringify(body.faceDescriptor) : null,
        registrationStatus: "pending",
        isActive: false,
      },
      select: { id: true, name: true, registrationStatus: true },
    });

    return ok(toJsonSafe(user), { status: 201 });
  });
}
