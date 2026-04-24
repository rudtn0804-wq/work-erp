import { ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  return routeGuard(async () => {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const notifications = await prisma.notification.findMany({
      where: userId ? { userId: BigInt(userId) } : undefined,
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return ok(toJsonSafe(notifications));
  });
}
