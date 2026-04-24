import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return routeGuard(async () => {
    const users = await prisma.user.findMany({
      where: { registrationStatus: "pending" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        profilePhoto: true,
        registrationStatus: true,
        createdAt: true,
      },
    });

    return ok(toJsonSafe(users));
  });
}
