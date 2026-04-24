import jwt from "jsonwebtoken";
import { fail, ok, routeGuard, toJsonSafe } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { faceLoginSchema } from "@/lib/validators";

const THRESHOLD = 0.55;

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export async function POST(request: Request) {
  return routeGuard(async () => {
    const body = faceLoginSchema.parse(await request.json());

    const users = await prisma.user.findMany({
      where: { isActive: true, registrationStatus: "approved", faceDescriptor: { not: null } },
      select: { id: true, name: true, role: true, faceDescriptor: true },
    });

    let bestMatch: { id: bigint; name: string; role: string } | null = null;
    let bestDist = Infinity;

    for (const user of users) {
      try {
        const stored: number[] = JSON.parse(user.faceDescriptor!);
        const dist = euclideanDistance(body.descriptor, stored);
        if (dist < bestDist) { bestDist = dist; bestMatch = user; }
      } catch { /* skip malformed descriptor */ }
    }

    if (!bestMatch || bestDist > THRESHOLD) {
      return fail("얼굴을 인식할 수 없습니다. 이메일로 로그인해주세요.", 401);
    }

    const token = jwt.sign(
      { sub: bestMatch.id.toString(), role: bestMatch.role, name: bestMatch.name },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" },
    );

    return ok(toJsonSafe({ token, user: { id: bestMatch.id, name: bestMatch.name, role: bestMatch.role } }));
  });
}
