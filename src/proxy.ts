import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/face-login",
  "/api/auth/register",
  "/api/mcp",
  "/api/setup/admin",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();

  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET 환경변수가 설정되지 않았습니다.");
    return NextResponse.json({ ok: false, error: "서버 설정 오류입니다." }, { status: 500 });
  }

  try {
    const payload = jwt.verify(token, secret) as { sub: string; role: string; name: string };
    const headers = new Headers(request.headers);
    headers.set("x-user-id", payload.sub);
    headers.set("x-user-role", payload.role);
    headers.set("x-user-name", payload.name);
    return NextResponse.next({ request: { headers } });
  } catch {
    return NextResponse.json({ ok: false, error: "유효하지 않은 토큰입니다." }, { status: 401 });
  }
}

export const config = {
  matcher: "/api/:path*",
};
