import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function routeGuard<T>(handler: () => Promise<T>) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ZodError) {
      return fail("입력값을 확인해주세요.", 422, error.flatten());
    }

    console.error(error);
    return fail("서버 처리 중 오류가 발생했습니다.", 500);
  }
}

export function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (typeof item === "bigint") return item.toString();
      if (item && typeof item === "object" && "toNumber" in item) {
        return item.toNumber();
      }
      return item;
    }),
  );
}
