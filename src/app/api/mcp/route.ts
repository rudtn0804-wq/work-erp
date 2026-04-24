import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const emitters = new Map<string, ReadableStreamDefaultController<Uint8Array>>();

export async function GET(request: Request) {
  const sessionId = crypto.randomUUID();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      emitters.set(sessionId, controller);
      const endpointEvent = `event: endpoint\ndata: /api/mcp?sessionId=${sessionId}\n\n`;
      controller.enqueue(new TextEncoder().encode(endpointEvent));
      request.signal.addEventListener("abort", () => {
        emitters.delete(sessionId);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") ?? "";
  const req = (await request.json()) as Record<string, unknown>;

  const method = (req.method as string) ?? "";
  const id = req.id;

  let result: unknown;
  try {
    result = await handleMethod(method, req);
  } catch (e) {
    result = { error: { code: -32603, message: String(e) } };
  }

  if (result === null) return new NextResponse(null, { status: 202 });

  const envelope: Record<string, unknown> = { jsonrpc: "2.0", id };
  if (result && typeof result === "object" && "error" in result) {
    envelope.error = (result as { error: unknown }).error;
  } else {
    envelope.result = result;
  }

  const controller = emitters.get(sessionId);
  if (controller) {
    const msg = `event: message\ndata: ${JSON.stringify(envelope)}\n\n`;
    try { controller.enqueue(new TextEncoder().encode(msg)); } catch { /* stream closed */ }
  }

  return new NextResponse(null, { status: 202 });
}

async function handleMethod(method: string, req: Record<string, unknown>): Promise<unknown> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "work-erp-mcp", version: "1.0.0" },
      };
    case "notifications/initialized":
      return null;
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call": {
      const params = req.params as { name: string; arguments?: Record<string, unknown> };
      const args = params.arguments ?? {};
      const text = await callTool(params.name, args);
      return { content: [{ type: "text", text }] };
    }
    default:
      return { error: { code: -32601, message: `Method not found: ${method}` } };
  }
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_users":          return getUsers();
    case "get_work_logs":      return getWorkLogs(args);
    case "get_schedules":      return getSchedules(args);
    case "get_payrolls":       return getPayrolls(args);
    case "get_attendance_today": return getAttendanceToday();
    default:                   return `알 수 없는 도구: ${name}`;
  }
}

async function getUsers(): Promise<string> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  if (!users.length) return "등록된 직원이 없습니다.";
  return `직원 목록 (${users.length}명)\n` +
    users.map(u => `- [${u.id}] ${u.name} (${u.role})`).join("\n");
}

async function getWorkLogs(args: Record<string, unknown>): Promise<string> {
  const from = args.start_date
    ? new Date(args.start_date as string)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = args.end_date ? new Date(args.end_date as string) : new Date();

  const logs = await prisma.workLog.findMany({
    where: { workDate: { gte: from, lte: to } },
    include: {
      user: { select: { name: true } },
      site: { select: { name: true } },
    },
    orderBy: { workDate: "desc" },
    take: 100,
  });
  if (!logs.length) return "해당 기간 작업 일지가 없습니다.";
  return `작업 일지 (${from.toLocaleDateString()} ~ ${to.toLocaleDateString()})\n총 ${logs.length}건\n\n` +
    logs.slice(0, 50).map(l =>
      `- ${l.workDate.toLocaleDateString()} ${l.user.name} @ ${l.site.name}`
    ).join("\n");
}

async function getSchedules(args: Record<string, unknown>): Promise<string> {
  const from = args.start_date ? new Date(args.start_date as string) : new Date();
  const to = args.end_date
    ? new Date(args.end_date as string)
    : new Date(Date.now() + 7 * 86400_000);

  const schedules = await prisma.schedule.findMany({
    where: { workDate: { gte: from, lte: to } },
    include: { site: { select: { name: true } } },
    orderBy: { workDate: "asc" },
    take: 100,
  });
  if (!schedules.length) return "해당 기간 일정이 없습니다.";
  return `일정 (${from.toLocaleDateString()} ~ ${to.toLocaleDateString()})\n총 ${schedules.length}건\n\n` +
    schedules.map(s =>
      `- ${s.workDate.toLocaleDateString()} [${s.status}] ${s.title} @ ${s.site.name}`
    ).join("\n");
}

async function getPayrolls(args: Record<string, unknown>): Promise<string> {
  const year = Number(args.year ?? new Date().getFullYear());
  const month = Number(args.month ?? (new Date().getMonth() + 1));
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

  const payrolls = await prisma.payroll.findMany({
    where: { yearMonth },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { user: { name: "asc" } },
  });
  if (!payrolls.length) return `${yearMonth} 급여 데이터가 없습니다.`;
  const total = payrolls.reduce((sum, p) => sum + Number(p.totalAmount), 0);
  return `${yearMonth} 급여 현황\n총 ${payrolls.length}명 / 합계 ${total.toLocaleString()}원\n\n` +
    payrolls.map(p =>
      `- ${p.user.name} (${p.user.role}): ${Number(p.totalAmount).toLocaleString()}원 [${p.paidStatus}]`
    ).join("\n");
}

async function getAttendanceToday(): Promise<string> {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const records = await prisma.attendance.findMany({
    where: { workDate: { gte: today, lt: tomorrow } },
    include: { user: { select: { name: true } } },
    orderBy: { checkInAt: "asc" },
  });
  if (!records.length) return "오늘 출근 기록이 없습니다.";
  return `오늘 출근 현황 (${records.length}명)\n\n` +
    records.map(r => {
      const inTime = r.checkInAt?.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) ?? "-";
      const outTime = r.checkOutAt?.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) ?? "미퇴근";
      return `- ${r.user.name}: ${inTime} ~ ${outTime}`;
    }).join("\n");
}

const TOOLS = [
  {
    name: "get_users",
    description: "현재 재직 중인 직원 목록을 조회합니다.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_work_logs",
    description: "작업 일지를 날짜 범위로 조회합니다.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "시작일 (yyyy-MM-dd), 미입력시 당월 1일" },
        end_date: { type: "string", description: "종료일 (yyyy-MM-dd), 미입력시 오늘" },
      },
    },
  },
  {
    name: "get_schedules",
    description: "현장 일정을 조회합니다.",
    inputSchema: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "시작일 (yyyy-MM-dd), 미입력시 오늘" },
        end_date: { type: "string", description: "종료일 (yyyy-MM-dd), 미입력시 7일 후" },
      },
    },
  },
  {
    name: "get_payrolls",
    description: "급여 현황을 조회합니다.",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "number", description: "연도, 미입력시 올해" },
        month: { type: "number", description: "월 (1-12), 미입력시 이번달" },
      },
    },
  },
  {
    name: "get_attendance_today",
    description: "오늘의 출퇴근 현황을 조회합니다.",
    inputSchema: { type: "object", properties: {} },
  },
];
