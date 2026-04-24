"use client";

import React, { useEffect, useState, useTransition } from "react";

type Role = "admin" | "leader" | "worker";
type Status = "planned" | "in_progress" | "completed" | "paused";

type User = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  dailyWage: NumericValue;
  registrationStatus?: string;
};

type Site = {
  id: string;
  name: string;
  clientName: string | null;
  clientPhone: string | null;
  address: string | null;
  latitude: NumericValue | null;
  longitude: NumericValue | null;
  status: Status;
  memo: string | null;
};

type Schedule = {
  id: string;
  title: string;
  description: string | null;
  workLocation: string | null;
  workType: string | null;
  workDate: string;
  startTime: string | null;
  endTime: string | null;
  estimatedWorkUnit: NumericValue;
  totalAmount: NumericValue | null;
  status: Status;
  createdById: string | null;
  site: Site;
  workers: { user: User; wage?: NumericValue | null }[];
};

type Payroll = {
  id: string;
  userId: string;
  yearMonth: string;
  totalWorkUnit: NumericValue;
  dailyWage: NumericValue;
  totalAmount: NumericValue;
  user: User;
};

type NumericValue = number | string;

type PaintOwner = "mine" | "boss" | "uncategorized";

type PaintLedgerEntry = {
  id: string;
  userId: string | null;
  sourceRow: number | null;
  workDate: string | null;
  siteAddress: string | null;
  materialSpec: string | null;
  amount: NumericValue | null;
  paymentStatus: string | null;
  memo: string | null;
  suppliedMaterials: string | null;
  laborCost: NumericValue | null;
  fuelCost: NumericValue | null;
  materialCost: NumericValue | null;
  ownerCategory: PaintOwner | null;
  isDayOff: boolean;
};

type Notice = {
  id: string;
  title: string;
  message: string;
};

export type InitialData = {
  today: string;
  month: string;
  users: User[];
  sites: Site[];
  schedules: Schedule[];
  payrolls: Payroll[];
  notices: Notice[];
  paintLedgerEntries: PaintLedgerEntry[];
  attendanceCount: number;
  pendingWorkLogCount: number;
  monthLaborCost: number;
};

type Session = {
  token: string;
  user: Pick<User, "id" | "name" | "role">;
};

type PendingUser = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  profilePhoto: string | null;
  registrationStatus: string;
  createdAt: string;
};

const statusLabel: Record<Status, string> = {
  planned: "예정",
  in_progress: "진행중",
  completed: "완료",
  paused: "보류",
};

const statusTone: Record<Status, string> = {
  planned: "bg-stone-100 text-stone-700",
  in_progress: "bg-emerald-100 text-emerald-800",
  completed: "bg-blue-100 text-blue-800",
  paused: "bg-amber-100 text-amber-800",
};


export function AppShell({ initialData }: { initialData: InitialData }) {
  const [session, setSession] = useState<Session | null>(null);
  const [schedules, setSchedules] = useState(initialData.schedules);
  const [users, setUsers] = useState(initialData.users);
  const [sites, setSites] = useState(initialData.sites);
  const [paintEntries, setPaintEntries] = useState(initialData.paintLedgerEntries);
  const [managerMenu, setManagerMenu] = useState<"field" | "paint" | "approval">("field");
  const [loginScreen, setLoginScreen] = useState<"login" | "signup" | "face">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [workerMessage, setWorkerMessage] = useState("");
  const [managerMessage, setManagerMessage] = useState("");
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [isSubmittingWorkerAction, setIsSubmittingWorkerAction] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const saved = window.localStorage.getItem("field-session");
    if (saved) {
      queueMicrotask(() => setSession(JSON.parse(saved)));
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadPaintEntries() {
      if (!session) {
        setPaintEntries(initialData.paintLedgerEntries);
        return;
      }

      const search =
        session.user.role === "worker"
          ? `?userId=${encodeURIComponent(session.user.id)}`
          : "?scope=manager";

      try {
        const response = await fetch(`/api/paint-ledger${search}`);
        const payload = await response.json();
        if (!ignore && payload.ok) {
          setPaintEntries(payload.data);
        }
      } catch {
        if (!ignore) {
          setPaintEntries(session.user.role === "worker" ? [] : initialData.paintLedgerEntries);
        }
      }
    }

    loadPaintEntries();

    return () => {
      ignore = true;
    };
  }, [initialData.paintLedgerEntries, session]);

  const visibleSchedules =
    session?.user.role === "worker"
      ? schedules.filter((schedule) =>
          schedule.workers.some((worker) => worker.user.id === session.user.id),
        )
      : schedules;

  const todaySchedules = visibleSchedules.filter((schedule) => isSameDate(schedule.workDate, initialData.today));
  const myPayroll = initialData.payrolls.find((payroll) => payroll.userId === session?.user.id);
  const isManager = session?.user.role === "admin" || session?.user.role === "leader";

  async function login() {
    setLoginError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();

    if (!payload.ok) {
      setLoginError(payload.error ?? "로그인에 실패했습니다.");
      return;
    }

    setSession(payload.data);
    window.localStorage.setItem("field-session", JSON.stringify(payload.data));
  }

  function logout() {
    setSession(null);
    window.localStorage.removeItem("field-session");
  }

  async function createSchedule(formData: FormData, form?: HTMLFormElement, workerWages?: Record<string, number>) {
    setFormMessage("");
    const workerIds = formData.getAll("workerIds").map(String);
    setIsSubmittingSchedule(true);

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          siteId: formData.get("siteId"),
          workDate: formData.get("workDate"),
          startTime: formData.get("startTime"),
          endTime: formData.get("endTime"),
          estimatedWorkUnit: formData.get("estimatedWorkUnit"),
          totalAmount: formData.get("totalAmount") || undefined,
          workLocation: formData.get("workLocation"),
          workType: formData.get("workType"),
          status: formData.get("status"),
          description: formData.get("description"),
          workerIds,
          workerWages,
          createdById: session?.user.id,
          createdByRole: session?.user.role,
        }),
      });
      const payload = await response.json();

      if (!payload.ok) {
        setFormMessage(payload.error ?? "일정 등록에 실패했습니다.");
        return;
      }

      setSchedules((current) =>
        [...current, payload.data.schedule].sort((a, b) => a.workDate.localeCompare(b.workDate)),
      );
      if (payload.data.paintLedgerEntry) {
        setPaintEntries((current) =>
          [...current, payload.data.paintLedgerEntry].sort((a, b) =>
            String(a.workDate).localeCompare(String(b.workDate)),
          ),
        );
      }
      setFormMessage("일정이 등록되었습니다.");
      form?.reset();
    } catch {
      setFormMessage("네트워크 또는 서버 오류로 등록하지 못했습니다.");
    } finally {
      setIsSubmittingSchedule(false);
    }
  }

  async function createWorker(formData: FormData, form?: HTMLFormElement) {
    setManagerMessage("");

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        role: formData.get("role"),
        dailyWage: formData.get("dailyWage"),
      }),
    });
    const payload = await response.json();

    if (!payload.ok) {
      setManagerMessage(payload.error ?? "작업자 등록에 실패했습니다.");
      return;
    }

    setUsers((current) => [...current, payload.data]);
    setManagerMessage("작업자가 등록되었습니다.");
    form?.reset();
  }

  async function handleAttendance(kind: "check-in" | "check-out", schedule?: Schedule) {
    if (!session) return;

    setWorkerMessage("");
    setIsSubmittingWorkerAction(true);

    try {
      const response = await fetch(`/api/attendance/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          siteId: schedule?.site.id,
          workDate: initialData.today.slice(0, 10),
        }),
      });
      const payload = await response.json();

      if (!payload.ok) {
        setWorkerMessage(payload.error ?? "출퇴근 처리에 실패했습니다.");
        return;
      }

      setWorkerMessage(kind === "check-in" ? "출근 처리되었습니다." : "퇴근 처리되었습니다.");
    } catch {
      setWorkerMessage("네트워크 오류로 처리하지 못했습니다.");
    } finally {
      setIsSubmittingWorkerAction(false);
    }
  }

  async function createWorkLog(formData: FormData, form?: HTMLFormElement) {
    if (!session) return;

    setWorkerMessage("");
    setIsSubmittingWorkerAction(true);

    try {
      const response = await fetch("/api/work-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: formData.get("siteId"),
          scheduleId: formData.get("scheduleId") || undefined,
          userId: session.user.id,
          workDate: initialData.today.slice(0, 10),
          content: formData.get("content"),
          issues: formData.get("issues"),
          materialRequest: formData.get("materialRequest"),
        }),
      });
      const payload = await response.json();

      if (!payload.ok) {
        setWorkerMessage(payload.error ?? "작업일지 저장에 실패했습니다.");
        return;
      }

      setWorkerMessage("작업일지가 저장되었습니다.");
      form?.reset();
    } catch {
      setWorkerMessage("네트워크 오류로 작업일지를 저장하지 못했습니다.");
    } finally {
      setIsSubmittingWorkerAction(false);
    }
  }

  async function updateScheduleStatus(scheduleId: string, status: Status) {
    setManagerMessage("");
    const response = await fetch(`/api/schedules/${scheduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json();

    if (!payload.ok) {
      setManagerMessage(payload.error ?? "일정 상태 변경에 실패했습니다.");
      return;
    }

    setSchedules((current) => current.map((schedule) => (schedule.id === scheduleId ? payload.data : schedule)));
    setManagerMessage("일정 상태가 변경되었습니다.");
  }

  async function deleteSchedule(scheduleId: string) {
    setManagerMessage("");
    const response = await fetch(`/api/schedules/${scheduleId}`, { method: "DELETE" });
    const payload = await response.json();

    if (!payload.ok) {
      setManagerMessage(payload.error ?? "일정 삭제에 실패했습니다.");
      return;
    }

    setSchedules((current) => current.filter((schedule) => schedule.id !== scheduleId));
    setManagerMessage("일정이 삭제되었습니다.");
  }

  async function updateSite(siteId: string, data: Record<string, unknown>): Promise<boolean> {
    const response = await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json();

    if (!payload.ok) {
      setManagerMessage(payload.error ?? "현장 정보 수정에 실패했습니다.");
      return false;
    }

    setSites((current) => current.map((s) => (s.id === siteId ? { ...s, ...payload.data } : s)));
    setSchedules((current) =>
      current.map((sc) => (sc.site.id === siteId ? { ...sc, site: { ...sc.site, ...payload.data } } : sc)),
    );
    return true;
  }

  async function createPaintEntry(formData: FormData, form?: HTMLFormElement, forUserId?: string) {
    setManagerMessage("");
    const response = await fetch("/api/paint-ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: forUserId ?? (session?.user.role === "worker" ? session.user.id : undefined),
        workDate: formData.get("workDate"),
        siteAddress: formData.get("siteAddress"),
        materialSpec: formData.get("materialSpec"),
        amount: formData.get("amount"),
        paymentStatus: formData.get("paymentStatus"),
        memo: formData.get("memo"),
        suppliedMaterials: formData.get("suppliedMaterials"),
        laborCost: formData.get("laborCost"),
        fuelCost: formData.get("fuelCost"),
        materialCost: formData.get("materialCost"),
        ownerCategory: formData.get("ownerCategory"),
        isDayOff: formData.get("isDayOff") === "on",
      }),
    });
    const payload = await response.json();

    if (!payload.ok) {
      setManagerMessage(payload.error ?? "페인트 장부 등록에 실패했습니다.");
      return;
    }

    setPaintEntries((current) =>
      [...current, payload.data].sort((a, b) => String(a.workDate).localeCompare(String(b.workDate))),
    );
    setManagerMessage("페인트 장부가 등록되었습니다.");
    form?.reset();
  }

  async function deletePaintEntry(id: string) {
    setManagerMessage("");
    const response = await fetch(`/api/paint-ledger/${id}`, { method: "DELETE" });
    const payload = await response.json();

    if (!payload.ok) {
      setManagerMessage(payload.error ?? "페인트 장부 삭제에 실패했습니다.");
      return;
    }

    setPaintEntries((current) => current.filter((entry) => entry.id !== id));
    setManagerMessage("페인트 장부가 삭제되었습니다.");
  }

  async function updatePaintEntry(id: string, data: Record<string, unknown>): Promise<boolean> {
    setManagerMessage("");
    const response = await fetch(`/api/paint-ledger/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json();

    if (!payload.ok) {
      setManagerMessage(payload.error ?? "수정에 실패했습니다.");
      return false;
    }

    setPaintEntries((current) =>
      current.map((entry) => (entry.id === id ? payload.data : entry)),
    );
    setManagerMessage("페인트 장부가 수정되었습니다.");
    return true;
  }

  if (!session) {
    const loginShell = "field-grid min-h-screen py-8 px-4";
    const loginInner = "mx-auto w-full max-w-5xl grid gap-6 lg:grid-cols-[1fr_400px] items-stretch";
    const heroCard = "rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-sm";
    const darkCard = "rounded-[2rem] bg-[#1f2a1b] text-white p-7 shadow-xl flex flex-col";
    const darkLabel = "block text-sm font-bold text-[#d7c9a6] mb-1";
    const darkInput = "block w-full h-14 rounded-2xl border border-white/20 bg-[#fffaf1] px-4 font-bold text-[#252019] outline-none focus:border-[#d98251] focus:shadow-[0_0_0_4px_rgba(217,130,81,0.25)] placeholder:text-[#7a7062]";

    if (loginScreen === "signup") {
      return (
        <main className={loginShell}>
          <div className={loginInner}>
            <div className={heroCard}>
              <p className="text-sm font-black tracking-[0.28em] text-[var(--clay)]">FIELD — 신규 가입</p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em]">작업자 회원가입</h1>
              <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
                가입 신청 후 관리자 승인을 받으면 로그인 가능합니다.<br />
                사진과 얼굴 등록을 완료하면 얼굴 인식으로 빠르게 로그인할 수 있습니다.
              </p>
              <button
                onClick={() => { setLoginScreen("login"); setLoginError(""); }}
                className="mt-8 text-sm font-black text-[var(--clay)] underline underline-offset-4"
              >
                ← 로그인으로 돌아가기
              </button>
            </div>
            <SignupForm
              onSuccess={() => { setLoginError(""); setLoginScreen("login"); }}
              darkCard={darkCard}
              darkLabel={darkLabel}
              darkInput={darkInput}
            />
          </div>
        </main>
      );
    }

    if (loginScreen === "face") {
      return (
        <main className={loginShell}>
          <div className={loginInner}>
            <div className={heroCard}>
              <p className="text-sm font-black tracking-[0.28em] text-[var(--clay)]">FIELD — 얼굴 인식</p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em]">얼굴로 로그인</h1>
              <p className="mt-5 text-lg leading-8 text-[var(--muted)]">
                카메라에 얼굴을 정면으로 맞추면 자동으로 인식합니다.<br />
                인식이 잘 안 될 경우 이메일 로그인을 이용해주세요.
              </p>
              <button
                onClick={() => { setLoginScreen("login"); setLoginError(""); }}
                className="mt-8 text-sm font-black text-[var(--clay)] underline underline-offset-4"
              >
                ← 이메일 로그인으로 돌아가기
              </button>
            </div>
            <FaceLoginCard
              darkCard={darkCard}
              onSuccess={(payload) => {
                const sess = { token: payload.token, user: { ...payload.user, role: payload.user.role as Role } };
                window.localStorage.setItem("field-session", JSON.stringify(sess));
                setSession(sess);
              }}
              onError={(msg) => { setLoginError(msg); setLoginScreen("login"); }}
            />
          </div>
        </main>
      );
    }

    return (
      <main className={loginShell}>
        <div className={loginInner}>
          <div className={heroCard}>
            <p className="text-sm font-black tracking-[0.28em] text-[var(--clay)]">FIELD LOGIN</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              현장 관리 시스템
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              관리자·반장은 전체 현장 일정과 인원을 관리하고,<br />
              작업자는 본인 일정·출퇴근·급여를 확인합니다.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => { setLoginScreen("face"); setLoginError(""); }}
                className="flex items-center gap-3 rounded-2xl border-2 border-[var(--clay)] bg-[var(--clay)] px-5 py-4 text-left text-white"
              >
                <span className="text-3xl">👤</span>
                <div>
                  <p className="font-black">얼굴 인식으로 로그인</p>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>카메라로 빠르게 인증</p>
                </div>
              </button>
              <button
                onClick={() => { setLoginScreen("signup"); setLoginError(""); }}
                className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-5 py-4 text-left"
              >
                <span className="text-3xl">✏️</span>
                <div>
                  <p className="font-black text-[var(--ink)]">신규 작업자 회원가입</p>
                  <p className="text-sm text-[var(--muted)]">관리자 승인 후 이용 가능</p>
                </div>
              </button>
            </div>
          </div>

          <form
            className={darkCard}
            onSubmit={(event) => { event.preventDefault(); startTransition(login); }}
          >
            <h2 className="text-2xl font-black">이메일 로그인</h2>
            <div className="mt-6">
              <label className={darkLabel}>이메일</label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="username"
                placeholder="이메일을 입력하세요"
                className={darkInput}
              />
            </div>
            <div className="mt-4">
              <label className={darkLabel}>비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="비밀번호를 입력하세요"
                className={darkInput}
              />
            </div>
            {loginError ? <p className="mt-4 rounded-2xl bg-red-500/20 p-3 text-sm">{loginError}</p> : null}
            <button
              disabled={isPending}
              className="mt-6 h-14 w-full rounded-2xl bg-[#d98251] text-lg font-black disabled:opacity-60"
            >
              {isPending ? "로그인 중..." : "로그인"}
            </button>
            <button
              type="button"
              onClick={() => { setLoginScreen("face"); setLoginError(""); }}
              className="mt-3 h-12 w-full rounded-2xl border text-sm font-black" style={{ borderColor: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}
            >
              👤 얼굴 인식으로 로그인
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="field-grid min-h-screen px-4 py-5">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-[var(--line)] bg-[var(--panel)]/95 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black tracking-[0.28em] text-[var(--clay)]">
              {isManager ? "MANAGER MODE" : "WORKER MODE"}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              {session.user.name}님, {isManager ? "전체 현장관리" : "내 작업 일정"}
            </h1>
          </div>
          <button onClick={logout} className="h-12 rounded-2xl bg-[var(--ink)] px-5 font-black text-white">
            로그아웃
          </button>
        </header>

        {isManager ? (
          <>
            <nav className="grid gap-2 grid-cols-3">
              {(["field", "paint", "approval"] as const).map((tab) => {
                const labels = { field: "현장 일정관리", paint: "페인트 장부", approval: "가입 승인" };
                return (
                  <button
                    key={tab}
                    onClick={() => setManagerMenu(tab)}
                    className={`h-12 rounded-2xl border font-black text-sm ${
                      managerMenu === tab ? "border-[var(--clay)] bg-[var(--clay)] text-white" : "border-[var(--line)] bg-white"
                    }`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </nav>
            {managerMenu === "field" ? (
              <ManagerView
                data={initialData}
                schedules={visibleSchedules}
                users={users}
                sites={sites}
                formMessage={formMessage}
                createSchedule={createSchedule}
                createWorker={createWorker}
                managerMessage={managerMessage}
                updateScheduleStatus={updateScheduleStatus}
                updateSite={updateSite}
                deleteSchedule={deleteSchedule}
                isPending={isSubmittingSchedule}
              />
            ) : managerMenu === "approval" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)]/95 p-5 shadow-sm">
                  <h2 className="font-black text-lg">가입 승인 대기</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">신규 작업자 가입 신청을 검토하고 승인 또는 거절합니다.</p>
                </div>
                <PendingUsersPanel />
              </div>
            ) : (
              <PaintLedgerView
                entries={paintEntries.filter((entry) => entry.userId === null)}
                managerMessage={managerMessage}
                createEntry={createPaintEntry}
                updateEntry={updatePaintEntry}
                deleteEntry={deletePaintEntry}
              />
            )}
          </>
        ) : (
          <WorkerView
            currentUser={session.user}
            todaySchedules={todaySchedules}
            schedules={visibleSchedules}
            allUsers={users}
            sites={sites}
            payroll={myPayroll}
            notices={initialData.notices}
            workerMessage={workerMessage}
            formMessage={formMessage}
            isPending={isSubmittingWorkerAction}
            isSubmittingSchedule={isSubmittingSchedule}
            handleAttendance={handleAttendance}
            createWorkLog={createWorkLog}
            createSchedule={createSchedule}
            paintEntries={paintEntries.filter((e) => e.userId === session.user.id)}
            createPaintEntry={(fd, form) => createPaintEntry(fd, form, session.user.id)}
            managerMessage={managerMessage}
            updatePaintEntry={updatePaintEntry}
            deletePaintEntry={deletePaintEntry}
          />
        )}
      </section>
    </main>
  );
}

function SiteCombobox({ sites, value, onChange }: { sites: Site[]; value: string; onChange: (siteId: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  React.useEffect(() => {
    if (value) {
      const site = sites.find((s) => s.id === value);
      if (site) setSelectedName(site.name);
    }
  }, [value, sites]);

  const filtered = query.trim()
    ? sites.filter((s) => s.name.includes(query) || (s.address ?? "").includes(query))
    : sites;

  function select(site: Site) {
    setSelectedName(site.name);
    setQuery("");
    setOpen(false);
    onChange(site.id);
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={open ? query : selectedName}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(""); setSelectedName(""); }}
        onFocus={() => { setOpen(true); setQuery(""); }}
        placeholder="현장명 검색 또는 입력"
        className="field-input"
        autoComplete="off"
      />
      <input type="hidden" name="siteId" value={value} />
      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-2xl border border-[var(--line)] bg-white shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--muted)]">검색 결과 없음</p>
          ) : (
            filtered.map((site) => (
              <button
                key={site.id}
                type="button"
                onMouseDown={() => select(site)}
                className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-[var(--panel)]"
              >
                <span className="text-sm font-black">{site.name}</span>
                {site.address && <span className="text-xs text-[var(--muted)]">{site.address}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ManagerView({
  data,
  schedules,
  users,
  sites,
  formMessage,
  managerMessage,
  createSchedule,
  createWorker,
  updateScheduleStatus,
  updateSite,
  deleteSchedule,
  isPending,
}: {
  data: InitialData;
  schedules: Schedule[];
  users: User[];
  sites: Site[];
  formMessage: string;
  managerMessage: string;
  createSchedule: (formData: FormData, form?: HTMLFormElement, workerWages?: Record<string, number>) => void;
  createWorker: (formData: FormData, form?: HTMLFormElement) => void;
  updateScheduleStatus: (scheduleId: string, status: Status) => void;
  updateSite: (siteId: string, data: Record<string, unknown>) => Promise<boolean>;
  deleteSchedule: (scheduleId: string) => void;
  isPending: boolean;
}) {
  const workers = users.filter((u) => u.role !== "admin" && (!u.registrationStatus || u.registrationStatus === "approved"));
  const [workerFormOpen, setWorkerFormOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? "");
  const [workLocation, setWorkLocation] = useState("");
  const [workerWages, setWorkerWages] = useState<Record<string, number>>({});

  React.useEffect(() => {
    if (formMessage === "일정이 등록되었습니다.") {
      setWorkLocation("");
      setSelectedSiteId(sites[0]?.id ?? "");
      setWorkerWages({});
    }
  }, [formMessage]);

  function openDaumPostcode() {
    const win = window as unknown as { daum?: { Postcode: new (opts: { oncomplete: (data: { roadAddress: string }) => void }) => { open: () => void } } };
    function run() {
      new win.daum!.Postcode({ oncomplete: (data) => setWorkLocation(data.roadAddress) }).open();
    }
    if (win.daum?.Postcode) { run(); return; }
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = run;
    document.head.appendChild(script);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="grid self-start gap-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <Kpi title="전체 일정" value={schedules.length} suffix="건" />
          <Kpi title="현장" value={sites.length} suffix="곳" />
          <Kpi title="출근" value={data.attendanceCount} suffix="명" />
          <Kpi title="미작성" value={data.pendingWorkLogCount} suffix="건" warn />
        </div>

        <Panel title="일정 목록" action="관리자/반장">
          {managerMessage ? (
            <p className="mb-3 rounded-2xl bg-[#fff3df] p-3 font-bold text-[var(--clay)]">{managerMessage}</p>
          ) : null}
          <div className="space-y-3">
            {schedules.slice(0, 12).map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                editable
                onStatusChange={updateScheduleStatus}
                onDelete={deleteSchedule}
                onUpdateSite={updateSite}
              />
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid self-start gap-4">
        <Panel title="작업자 등록" action="이름/전화번호">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setWorkerFormOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-left"
            >
              <div>
                <p className="font-black text-[var(--ink)]">
                  {workerFormOpen ? "작업자 등록 폼 닫기" : "작업자 등록 폼 열기"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  현재 등록 인원 {workers.length}명
                </p>
              </div>
              <span className="text-2xl font-black text-[var(--clay)]">
                {workerFormOpen ? "−" : "+"}
              </span>
            </button>

            {workerFormOpen ? (
              <form
                className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  createWorker(new FormData(event.currentTarget), event.currentTarget);
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="이름">
                    <input name="name" placeholder="예: 홍길동" className="field-input" required />
                  </Field>
                  <Field label="전화번호">
                    <input name="phone" placeholder="예: 010-1234-5678" className="field-input" />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="역할">
                    <select name="role" defaultValue="worker" className="field-input">
                      <option value="worker">작업자</option>
                      <option value="leader">반장</option>
                    </select>
                  </Field>
                  <Field label="일당">
                    <input name="dailyWage" type="number" min="0" step="1000" placeholder="예: 180000" className="field-input" />
                  </Field>
                  <Field label="로그인 이메일">
                    <input name="email" type="email" placeholder="선택 입력" className="field-input" />
                  </Field>
                </div>
                <p className="text-xs font-bold text-[var(--muted)]">
                  이메일을 입력하면 기본 비밀번호 `password1234`로 로그인할 수 있습니다.
                </p>
                <button className="h-12 rounded-2xl bg-[var(--ink)] font-black text-white">작업자 등록</button>
              </form>
            ) : null}
          </div>
        </Panel>

        <Panel title="일정 추가" action="신규 등록">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              createSchedule(new FormData(event.currentTarget), event.currentTarget, workerWages);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="작업일">
                <input name="workDate" type="date" defaultValue={data.today.slice(0, 10)} className="field-input" required />
              </Field>
              <Field label="상태">
                <select name="status" defaultValue="planned" className="field-input">
                  <option value="planned">예정</option>
                  <option value="in_progress">진행중</option>
                  <option value="completed">완료</option>
                  <option value="paused">보류</option>
                </select>
              </Field>
            </div>
            <Field label="현장">
              <SiteCombobox sites={sites} value={selectedSiteId} onChange={setSelectedSiteId} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="작업 위치">
                <div className="flex gap-2">
                  <input
                    name="workLocation"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    placeholder="예: 1203호 주방 / B동 3층 복도"
                    className="field-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={openDaumPostcode}
                    className="shrink-0 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-black text-[var(--muted)]"
                  >
                    주소검색
                  </button>
                </div>
              </Field>
              <Field label="작업 구분">
                <select name="workType" defaultValue="interior" className="field-input">
                  <option value="demolition">철거</option>
                  <option value="carpentry">목공</option>
                  <option value="wallpaper">도배</option>
                  <option value="painting">도장</option>
                  <option value="flooring">바닥</option>
                  <option value="electric">전기</option>
                  <option value="interior">기타 인테리어</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="시작 시간">
                <input name="startTime" type="time" defaultValue="08:00" className="field-input" />
              </Field>
              <Field label="종료 시간">
                <input name="endTime" type="time" defaultValue="17:00" className="field-input" />
              </Field>
              <Field label="예상 공수">
                <input
                  name="estimatedWorkUnit"
                  type="number"
                  min="0"
                  max="9.99"
                  step="0.5"
                  defaultValue="1"
                  className="field-input"
                />
              </Field>
            </div>
            <Field label="일정 제목">
              <input name="title" placeholder="예: 주방 철거 및 폐기물 반출" className="field-input" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="총 계약금액 (총금액)">
                <div className="flex items-center gap-2">
                  <input
                    name="totalAmount"
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="예: 500000"
                    className="field-input flex-1"
                  />
                  <span className="text-sm text-[var(--muted)]">원</span>
                </div>
              </Field>
              <Field label="설명">
                <textarea
                  name="description"
                  placeholder="작업 내용, 자재, 특이사항"
                  className="field-input py-3"
                  rows={1}
                />
              </Field>
            </div>
            <div>
              <p className="text-sm font-black text-[var(--muted)]">작업자 배정 및 개인 수령액</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">총금액과 개인 수령액은 다를 수 있습니다 (하청, 마진 등)</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {workers.map((worker) => {
                  const checked = worker.id in workerWages;
                  return (
                    <div
                      key={worker.id}
                      className={`rounded-2xl border p-3 font-bold transition-colors ${checked ? "border-[var(--clay)] bg-[#fff8f0]" : "border-[var(--line)] bg-white"}`}
                    >
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          name="workerIds"
                          type="checkbox"
                          value={worker.id}
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWorkerWages((prev) => ({ ...prev, [worker.id]: toNumber(worker.dailyWage) }));
                            } else {
                              setWorkerWages((prev) => { const n = { ...prev }; delete n[worker.id]; return n; });
                            }
                          }}
                          className="h-5 w-5 accent-[#b95f3b]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block">{worker.name}</span>
                          <span className="block truncate text-xs text-[var(--muted)]">{worker.phone || "전화번호 미등록"}</span>
                        </span>
                        <span className="shrink-0 text-xs text-[var(--muted)]">
                          {worker.role === "leader" ? "반장" : "작업자"}
                        </span>
                      </label>
                      {checked && (
                        <div className="mt-2 flex items-center gap-2">
                          <label className="text-xs font-black text-[var(--muted)]">이 작업 일당</label>
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            value={workerWages[worker.id] ?? ""}
                            onChange={(e) => setWorkerWages((prev) => ({ ...prev, [worker.id]: Number(e.target.value) }))}
                            className="field-input flex-1 h-9 text-sm"
                            placeholder={String(toNumber(worker.dailyWage))}
                          />
                          <span className="text-xs text-[var(--muted)]">원</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {formMessage ? <p className="rounded-2xl bg-[#fff3df] p-3 font-bold text-[var(--clay)]">{formMessage}</p> : null}
            <button disabled={isPending} className="h-14 rounded-2xl bg-[var(--clay)] text-lg font-black text-white">
              {isPending ? "등록 중..." : "일정 등록"}
            </button>
          </form>
        </Panel>

        <Panel title="급여정산" action={data.month}>
          <div className="rounded-3xl bg-[var(--ink)] p-5 text-white">
            <p className="text-sm text-white/60">이번달 작업 기반 인건비</p>
            <p className="mt-2 text-4xl font-black">{formatMoney(data.monthLaborCost)}원</p>
            <p className="mt-1 text-xs text-white/40">배정된 작업별 급여 합산 (미입력 시 일당 기준)</p>
          </div>
          {data.payrolls.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-[var(--muted)]">이번달 배정된 작업이 없습니다.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {data.payrolls.map((payroll) => (
                <div key={payroll.id} className="flex items-center justify-between rounded-2xl bg-white p-4 font-bold">
                  <div>
                    <span>{payroll.user.name}</span>
                    <span className="ml-2 text-xs font-normal text-[var(--muted)]">{payroll.totalWorkUnit}작업</span>
                  </div>
                  <span className="text-[var(--clay)]">{formatMoney(payroll.totalAmount)}원</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

// ─── Face Login Card ────────────────────────────────────────────────────────

const FACE_API_CDN = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js";
const MODEL_CDN = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model";

type FaceApiWindow = Window & {
  faceapi?: {
    nets: {
      ssdMobilenetv1: { loadFromUri: (url: string) => Promise<void>; isLoaded: boolean };
      faceLandmark68Net: { loadFromUri: (url: string) => Promise<void>; isLoaded: boolean };
      faceRecognitionNet: { loadFromUri: (url: string) => Promise<void>; isLoaded: boolean };
    };
    detectSingleFace: (input: HTMLVideoElement) => {
      withFaceLandmarks: () => {
        withFaceDescriptor: () => Promise<{ descriptor: Float32Array } | undefined>;
      };
    };
  };
};

async function loadFaceApi(): Promise<NonNullable<FaceApiWindow["faceapi"]>> {
  const w = window as FaceApiWindow;
  if (!w.faceapi) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = FACE_API_CDN;
      s.onload = () => res();
      s.onerror = () => rej(new Error("face-api 로드 실패"));
      document.head.appendChild(s);
    });
  }
  const api = (window as FaceApiWindow).faceapi!;
  if (!api.nets.ssdMobilenetv1.isLoaded) await api.nets.ssdMobilenetv1.loadFromUri(MODEL_CDN);
  if (!api.nets.faceLandmark68Net.isLoaded) await api.nets.faceLandmark68Net.loadFromUri(MODEL_CDN);
  if (!api.nets.faceRecognitionNet.isLoaded) await api.nets.faceRecognitionNet.loadFromUri(MODEL_CDN);
  return api;
}

function FaceLoginCard({
  onSuccess,
  onError,
  darkCard = "rounded-[2rem] bg-[#1f2a1b] text-white p-7 shadow-xl flex flex-col",
}: {
  onSuccess: (payload: { token: string; user: { id: string; name: string; role: string } }) => void;
  onError: (msg: string) => void;
  darkCard?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "scanning" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const streamRef = React.useRef<MediaStream | null>(null);

  async function start() {
    setStatus("loading");
    setMsg("모델을 불러오는 중... (최초 1회 약 30초 소요)");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await loadFaceApi();
      setStatus("scanning");
      setMsg("얼굴을 카메라 정면에 맞춰주세요...");
      scan();
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : "카메라 접근 실패");
    }
  }

  async function scan() {
    const api = (window as FaceApiWindow).faceapi!;
    const video = videoRef.current;
    if (!video) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const result = await api.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
      if (result) {
        clearInterval(interval);
        setMsg("얼굴 인식 완료. 로그인 중...");
        stopStream();
        const descriptor = Array.from(result.descriptor);
        try {
          const res = await fetch("/api/auth/face-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ descriptor }),
          });
          const data = await res.json();
          if (!data.ok) { setStatus("error"); setMsg(data.error ?? "인식 실패"); return; }
          setStatus("done");
          onSuccess({ token: data.data.token, user: data.data.user });
        } catch {
          setStatus("error");
          setMsg("서버 오류");
        }
      } else if (attempts > 30) {
        clearInterval(interval);
        setStatus("error");
        setMsg("얼굴을 인식하지 못했습니다. 다시 시도하거나 이메일로 로그인하세요.");
        stopStream();
      }
    }, 500);
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  React.useEffect(() => () => stopStream(), []);

  return (
    <div className={`${darkCard} gap-4`}>
      <h2 className="text-2xl font-black">얼굴 인식 로그인</h2>
      <div className="relative overflow-hidden rounded-2xl bg-black aspect-video flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
            <span className="text-5xl">📷</span>
            <p className="text-sm font-bold">카메라를 시작하려면 아래 버튼을 누르세요</p>
          </div>
        )}
        {(status === "loading" || status === "scanning") && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-3 text-center text-xs text-white font-bold">
            {msg}
          </div>
        )}
      </div>
      {status === "error" && (
        <p className="rounded-2xl bg-red-500/20 p-3 text-sm text-red-200">{msg}</p>
      )}
      {status === "idle" || status === "error" ? (
        <button
          onClick={start}
          className="h-14 w-full rounded-2xl bg-[#d98251] text-lg font-black"
        >
          {status === "error" ? "다시 시도" : "카메라 시작"}
        </button>
      ) : status === "done" ? (
        <p className="rounded-2xl bg-green-500/20 p-3 text-center text-sm font-black text-green-300">✓ 로그인 성공</p>
      ) : null}
      <button
        type="button"
        onClick={() => { stopStream(); onError(""); }}
        className="text-sm font-bold text-white/50 underline underline-offset-2"
      >
        이메일로 로그인
      </button>
    </div>
  );
}

// ─── Signup Form ─────────────────────────────────────────────────────────────

function SignupForm({
  onSuccess,
  darkCard = "rounded-[2rem] bg-[#1f2a1b] text-white p-7 shadow-xl flex flex-col",
  darkLabel = "block text-sm font-bold text-[#d7c9a6] mb-1",
  darkInput = "block w-full h-14 rounded-2xl border border-white/20 bg-[#fffaf1] px-4 font-bold text-[#252019] outline-none focus:border-[#d98251] placeholder:text-[#7a7062]",
}: {
  onSuccess: () => void;
  darkCard?: string;
  darkLabel?: string;
  darkInput?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [step, setStep] = useState<"form" | "camera" | "preview">("form");
  const [photo, setPhoto] = useState<string>("");
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [cameraMsg, setCameraMsg] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  React.useEffect(() => () => stopStream(), []);

  async function startCamera() {
    setStep("camera");
    setCameraMsg("카메라 준비 중...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraMsg("정면을 바라보고 [사진 촬영] 버튼을 누르세요");
    } catch {
      setCameraMsg("카메라 접근 실패. 권한을 허용해주세요.");
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setPhoto(dataUrl);
    setCameraMsg("얼굴 특징을 추출하는 중...");
    try {
      await loadFaceApi();
      const api = (window as FaceApiWindow).faceapi!;
      const result = await api.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
      if (result) {
        setDescriptor(Array.from(result.descriptor));
        setCameraMsg("얼굴 등록 완료 ✓");
      } else {
        setCameraMsg("얼굴을 감지하지 못했습니다. 다시 촬영해주세요.");
      }
    } catch {
      setCameraMsg("얼굴 추출 실패 — 사진만 등록됩니다.");
    }
    stopStream();
    setStep("preview");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!photo) { setError("사진을 촬영해주세요."); return; }
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      phone: fd.get("phone") as string,
      address: fd.get("address") as string,
      email: fd.get("email") as string || undefined,
      password: fd.get("password") as string,
      profilePhoto: photo,
      faceDescriptor: descriptor ?? undefined,
    };
    if (!body.name || !body.phone || !body.address || !body.password) {
      setError("필수 항목을 모두 입력해주세요."); return;
    }
    if (body.password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error ?? "가입 실패"); return; }
      setSuccess("가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.");
      setTimeout(onSuccess, 2500);
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className={`${darkCard} items-center justify-center gap-4 text-center`}>
        <span className="text-6xl">✅</span>
        <p className="text-xl font-black">가입 신청 완료</p>
        <p className="text-sm text-white/60">{success}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} className={`${darkCard} gap-4 overflow-y-auto max-h-[90vh]`} onSubmit={handleSubmit}>
      <h2 className="text-2xl font-black shrink-0">회원가입</h2>

      {/* Photo capture */}
      <div className="shrink-0">
        <p className="text-sm font-bold text-[#d7c9a6]">프로필 사진 <span className="text-red-400">*</span></p>
        {step === "form" && (
          <button
            type="button"
            onClick={startCamera}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 py-6 text-sm font-black text-white/60 hover:border-[#d98251] hover:text-[#d98251]"
          >
            📷 카메라로 사진 촬영
          </button>
        )}
        {step === "camera" && (
          <div className="mt-2 space-y-2">
            <video ref={videoRef} className="w-full rounded-2xl object-cover aspect-video bg-black" muted playsInline />
            <p className="text-xs text-center text-white/60">{cameraMsg}</p>
            <button type="button" onClick={capturePhoto} className="w-full h-12 rounded-2xl bg-[#d98251] font-black text-white">
              사진 촬영
            </button>
          </div>
        )}
        {step === "preview" && (
          <div className="mt-2 space-y-2">
            <img src={photo} alt="촬영된 사진" className="w-full rounded-2xl object-cover aspect-video" />
            <p className="text-xs text-center text-white/60">{cameraMsg}</p>
            <button type="button" onClick={() => { setStep("form"); setPhoto(""); setDescriptor(null); }} className="w-full h-10 rounded-xl border border-white/20 text-sm font-black text-white/60">
              다시 촬영
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-bold text-[#d7c9a6]">이름 <span className="text-red-400">*</span></label>
          <input name="name" placeholder="실명을 입력하세요" required className={`${darkInput} mt-1`} />
        </div>
        <div>
          <label className="text-sm font-bold text-[#d7c9a6]">휴대폰 번호 <span className="text-red-400">*</span></label>
          <input name="phone" type="tel" placeholder="010-0000-0000" required className={`${darkInput} mt-1`} />
        </div>
        <div>
          <label className="text-sm font-bold text-[#d7c9a6]">주소 <span className="text-red-400">*</span></label>
          <input name="address" placeholder="거주지 주소" required className={`${darkInput} mt-1`} />
        </div>
        <div>
          <label className="text-sm font-bold text-[#d7c9a6]">로그인 아이디 (이메일) <span className="text-white/40">(선택)</span></label>
          <input name="email" type="email" placeholder="이메일 주소 — 이메일 로그인 시 필요" className={`${darkInput} mt-1`} />
          <p className="mt-1 text-xs text-white/40">얼굴 인식 로그인만 사용하면 선택 입력</p>
        </div>
        <div>
          <label className="text-sm font-bold text-[#d7c9a6]">비밀번호 <span className="text-red-400">*</span></label>
          <input name="password" type="password" placeholder="6자 이상" required minLength={6} className={`${darkInput} mt-1`} />
        </div>
      </div>

      {error && <p className="rounded-2xl bg-red-500/20 p-3 text-sm text-red-200">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !photo}
        className="h-14 w-full rounded-2xl bg-[#d98251] text-lg font-black disabled:opacity-50 shrink-0"
      >
        {submitting ? "가입 신청 중..." : "가입 신청"}
      </button>
    </form>
  );
}

// ─── Admin Pending Users Panel ────────────────────────────────────────────────

function PendingUsersPanel() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  React.useEffect(() => {
    fetch("/api/users/pending")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setUsers(d.data); })
      .finally(() => setLoading(false));
  }, []);

  async function decide(id: string, action: "approve" | "reject") {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setMsg(action === "approve" ? "승인되었습니다." : "거절되었습니다.");
    }
  }

  if (loading) return <p className="text-sm text-[var(--muted)]">불러오는 중...</p>;
  if (users.length === 0) return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5 text-center text-sm text-[var(--muted)]">
      {msg || "대기 중인 가입 신청이 없습니다."}
    </div>
  );

  return (
    <div className="space-y-3">
      {msg && <p className="rounded-xl bg-[var(--olive)] px-4 py-2 text-sm font-black text-white">{msg}</p>}
      {users.map((u) => (
        <div key={u.id} className="flex gap-4 rounded-2xl border border-[var(--line)] bg-white p-4">
          {u.profilePhoto ? (
            <img src={u.profilePhoto} alt={u.name} className="h-16 w-16 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-2xl">👤</div>
          )}
          <div className="flex flex-1 flex-col justify-between gap-2 min-w-0">
            <div>
              <p className="font-black">{u.name}</p>
              <p className="text-sm text-[var(--muted)]">{u.phone} {u.email ? `· ${u.email}` : ""}</p>
              {u.address && <p className="truncate text-xs text-[var(--muted)]">{u.address}</p>}
              <p className="text-xs text-[var(--muted)]">신청: {u.createdAt.slice(0, 10)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => decide(u.id, "approve")}
                className="flex-1 rounded-xl bg-[var(--olive)] py-2 text-sm font-black text-white"
              >
                승인
              </button>
              <button
                onClick={() => decide(u.id, "reject")}
                className="flex-1 rounded-xl bg-red-100 py-2 text-sm font-black text-red-700"
              >
                거절
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

function PaymentQuickAction({
  entry,
  updateEntry,
}: {
  entry: PaintLedgerEntry;
  updateEntry: (id: string, data: Record<string, unknown>) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"idle" | "input">("idle");
  const [customText, setCustomText] = useState("");

  const hasAmount = toNumber(entry.amount ?? 0) > 0;
  if (!hasAmount) return null;

  const isPaid = !!entry.paymentStatus;
  const todayLabel = (() => {
    const d = new Date();
    return `${d.getMonth() + 1}월 ${d.getDate()}일 입금`;
  })();

  async function markPaid(paymentStatus: string) {
    await updateEntry(entry.id, { paymentStatus: paymentStatus || null });
    setMode("idle");
    setCustomText("");
  }

  if (isPaid) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
          ✓ {entry.paymentStatus}
        </span>
        <button
          onClick={() => markPaid("")}
          className="text-xs text-[var(--muted)] underline underline-offset-2"
        >
          취소
        </button>
      </div>
    );
  }

  if (mode === "input") {
    return (
      <div className="flex gap-1.5">
        <input
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customText.trim()) markPaid(customText.trim());
            if (e.key === "Escape") { setMode("idle"); setCustomText(""); }
          }}
          placeholder="예: 5월 30일 카드 / 계좌이체"
          autoFocus
          className="field-input h-9 flex-1 text-sm"
        />
        <button
          onClick={() => customText.trim() && markPaid(customText.trim())}
          className="shrink-0 rounded-lg bg-[var(--olive)] px-3 text-xs font-black text-white"
        >
          저장
        </button>
        <button
          onClick={() => { setMode("idle"); setCustomText(""); }}
          className="shrink-0 rounded-lg bg-stone-100 px-3 text-xs font-black text-stone-600"
        >
          취소
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => markPaid(todayLabel)}
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"
      >
        오늘 입금
      </button>
      <button
        onClick={() => setMode("input")}
        className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-black text-[var(--muted)]"
      >
        날짜 입력
      </button>
    </div>
  );
}

function PaintLedgerList({
  entries,
  onOpenEntry,
}: {
  entries: PaintLedgerEntry[];
  onOpenEntry: (entry: PaintLedgerEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white p-8 text-center text-[var(--muted)]">
        현재 조건에 맞는 장부 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
      <table className="w-full min-w-[1180px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#9fbaa7] bg-[#c8e2d0] text-[var(--ink)]">
            <th className="px-3 py-2 text-left font-black">날짜</th>
            <th className="px-3 py-2 text-left font-black">현장 / 주소</th>
            <th className="px-3 py-2 text-left font-black">사용자재</th>
            <th className="px-3 py-2 text-right font-black">금액</th>
            <th className="px-3 py-2 text-left font-black">결제 여부</th>
            <th className="px-3 py-2 text-left font-black">비고</th>
            <th className="px-3 py-2 text-left font-black">자재</th>
            <th className="px-3 py-2 text-right font-black">인건비</th>
            <th className="px-3 py-2 text-right font-black">기름</th>
            <th className="px-3 py-2 text-right font-black">자재비</th>
            <th className="px-3 py-2 text-center font-black">상세</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const amount = toNumber(entry.amount ?? 0);
            const isHoliday = entry.isDayOff || entry.siteAddress?.includes("휴무");
            const hasPayment = !!entry.paymentStatus;

            return (
              <tr
                key={entry.id}
                onClick={() => onOpenEntry(entry)}
                className="cursor-pointer border-b border-stone-200 align-top hover:bg-[#fff8e8]"
              >
                <td className={`whitespace-nowrap px-3 py-2 font-bold ${isHoliday ? "text-red-600" : ""}`}>
                  {formatLedgerDate(entry.workDate)}
                </td>
                <td className={`px-3 py-2 ${isHoliday ? "text-center font-black text-red-600" : "font-medium"}`}>
                  {entry.siteAddress}
                </td>
                <td className="px-3 py-2 text-center">{entry.materialSpec}</td>
                <td
                  className={`whitespace-nowrap px-3 py-2 text-right font-black ${
                    amount > 0 ? (hasPayment ? "bg-red-500 text-black" : "bg-orange-300 text-black") : ""
                  }`}
                >
                  {amount > 0 ? `₩${formatMoney(amount)}` : ""}
                </td>
                <td className={`whitespace-nowrap px-3 py-2 font-bold ${hasPayment ? "bg-red-500 text-black" : ""}`}>
                  {entry.paymentStatus}
                </td>
                <td className="px-3 py-2">{entry.memo}</td>
                <td className="px-3 py-2 text-xs leading-5">{entry.suppliedMaterials}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{formatMoneyOrBlank(entry.laborCost)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{formatMoneyOrBlank(entry.fuelCost)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{formatMoneyOrBlank(entry.materialCost)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenEntry(entry);
                    }}
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-black text-[var(--clay)] hover:border-[var(--clay)]"
                  >
                    상세
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaintLedgerView({
  entries,
  managerMessage,
  createEntry,
  updateEntry,
  deleteEntry,
}: {
  entries: PaintLedgerEntry[];
  managerMessage: string;
  createEntry: (formData: FormData, form?: HTMLFormElement) => void;
  updateEntry: (id: string, data: Record<string, unknown>) => Promise<boolean>;
  deleteEntry: (id: string) => void;
}) {
  const now = new Date();

  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<"idle" | "detail" | "add">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [ledgerViewMode, setLedgerViewMode] = useState<"calendar" | "list">("calendar");
  const [modalEntry, setModalEntry] = useState<PaintLedgerEntry | null>(null);

  const calMonthStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
  const [calYearStr, calMonStr] = calMonthStr.split("-");
  const monthLabel = `${calYearStr}년 ${Number(calMonStr)}월`;
  const todayStr = now.toISOString().slice(0, 10);

  const entriesByDate = React.useMemo(() => {
    const map = new Map<string, PaintLedgerEntry[]>();
    for (const e of entries) {
      if (!e.workDate) continue;
      const dk = e.workDate.slice(0, 10);
      const list = map.get(dk) ?? [];
      list.push(e);
      map.set(dk, list);
    }
    return map;
  }, [entries]);

  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calDays: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calDays.length % 7 !== 0) calDays.push(null);

  const monthEntries = entries.filter((e) => e.workDate?.startsWith(calMonthStr));
  const yearEntries = entries.filter((e) => e.workDate?.startsWith(calYearStr));
  const ms = summarizePaintLedger(monthEntries);
  const ys = summarizePaintLedger(yearEntries);

  const unpaidCount = monthEntries.filter(isPaintUnpaid).length;
  const paidCount = monthEntries.filter((e) => toNumber(e.amount ?? 0) > 0 && !!e.paymentStatus).length;

  function matchesFilter(e: PaintLedgerEntry) {
    if (paymentFilter === "all") return true;
    const hasAmt = toNumber(e.amount ?? 0) > 0;
    if (paymentFilter === "unpaid") return isPaintUnpaid(e);
    if (paymentFilter === "paid") return hasAmt && !!e.paymentStatus;
    return true;
  }

  const filteredEntriesByDate = React.useMemo(() => {
    if (paymentFilter === "all") return entriesByDate;
    const m = new Map<string, PaintLedgerEntry[]>();
    for (const [date, list] of entriesByDate) {
      const filtered = list.filter(matchesFilter);
      if (filtered.length > 0) m.set(date, filtered);
    }
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesByDate, paymentFilter]);

  const allSelectedEntries = selectedDate ? (entriesByDate.get(selectedDate) ?? []) : [];
  const selectedEntries = allSelectedEntries.filter(matchesFilter);
  const listEntries = monthEntries
    .filter(matchesFilter)
    .sort((a, b) => `${a.workDate ?? ""}-${a.sourceRow ?? 0}`.localeCompare(`${b.workDate ?? ""}-${b.sourceRow ?? 0}`));

  function goToPrev() {
    if (calMonth === 0) {
      setCalYear((y) => y - 1);
      setCalMonth(11);
    } else {
      setCalMonth((m) => m - 1);
    }
    setSelectedDate(null);
    setRightPanel("idle");
    setEditingId(null);
  }

  function goToNext() {
    if (calMonth === 11) {
      setCalYear((y) => y + 1);
      setCalMonth(0);
    } else {
      setCalMonth((m) => m + 1);
    }
    setSelectedDate(null);
    setRightPanel("idle");
    setEditingId(null);
  }

  function handleDayClick(day: number) {
    const dk = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dk);
    setEditingId(null);
    setRightPanel("detail");
  }

  function startEdit(entry: PaintLedgerEntry) {
    setEditingId(entry.id);
    setEditData({
      workDate: entry.workDate?.slice(0, 10) ?? "",
      ownerCategory: entry.ownerCategory ?? "mine",
      siteAddress: entry.siteAddress ?? "",
      materialSpec: entry.materialSpec ?? "",
      amount: entry.amount != null ? String(toNumber(entry.amount)) : "",
      paymentStatus: entry.paymentStatus ?? "",
      laborCost: entry.laborCost != null ? String(toNumber(entry.laborCost)) : "",
      fuelCost: entry.fuelCost != null ? String(toNumber(entry.fuelCost)) : "",
      materialCost: entry.materialCost != null ? String(toNumber(entry.materialCost)) : "",
      memo: entry.memo ?? "",
      suppliedMaterials: entry.suppliedMaterials ?? "",
      isDayOff: entry.isDayOff ? "true" : "false",
    });
  }

  async function saveEdit(closeModal = false) {
    if (!editingId) return;
    setIsSaving(true);
    const ok = await updateEntry(editingId, {
      workDate: editData.workDate || undefined,
      ownerCategory: editData.ownerCategory || undefined,
      siteAddress: editData.siteAddress || undefined,
      materialSpec: editData.materialSpec || undefined,
      amount: editData.amount !== "" ? Number(editData.amount) : undefined,
      paymentStatus: editData.paymentStatus || undefined,
      laborCost: editData.laborCost !== "" ? Number(editData.laborCost) : undefined,
      fuelCost: editData.fuelCost !== "" ? Number(editData.fuelCost) : undefined,
      materialCost: editData.materialCost !== "" ? Number(editData.materialCost) : undefined,
      memo: editData.memo || undefined,
      suppliedMaterials: editData.suppliedMaterials || undefined,
      isDayOff: editData.isDayOff === "true",
    });
    setIsSaving(false);
    if (ok) {
      setEditingId(null);
      if (closeModal) setModalEntry(null);
    }
  }

  function be(field: string) {
    return {
      value: editData[field] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setEditData((prev) => ({ ...prev, [field]: e.target.value })),
    };
  }

  return (
    <div className="space-y-4">
      {managerMessage ? (
        <p className="rounded-2xl bg-[#fff3df] px-4 py-3 font-bold text-[var(--clay)]">{managerMessage}</p>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PaintKpi label="내꺼 매출" value={ms.mineRevenue} />
        <PaintKpi label="신사장 매출" value={ms.bossRevenue} />
        <PaintKpi label="지출 합계" value={ms.expenseTotal} warn />
        <PaintKpi label="월 순이익" value={ms.netProfit} accent />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="text-xs font-black text-[var(--muted)]">신사장 3.3% 세금</p>
          <p className="mt-1.5 text-xl font-black">{formatMoney(ms.bossTax)}원</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="text-xs font-black text-[var(--muted)]">공제 후 지급</p>
          <p className="mt-1.5 text-xl font-black">{formatMoney(ms.bossAfterTax)}원</p>
        </div>
        <div className="rounded-2xl bg-[var(--ink)] p-4 text-white">
          <p className="text-xs font-black text-white/60">{calYearStr}년 순이익</p>
          <p className="mt-1.5 text-xl font-black">{formatMoney(ys.netProfit)}원</p>
        </div>
      </div>

      {/* Payment filter tabs */}
      <div className="flex gap-1 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1.5">
        {(
          [
            { key: "all", label: "전체", count: monthEntries.length },
            { key: "unpaid", label: "미입금", count: unpaidCount },
            { key: "paid", label: "입금", count: paidCount },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setPaymentFilter(key)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-sm font-black transition-colors ${
              paymentFilter === key
                ? key === "unpaid"
                  ? "bg-red-500 text-white"
                  : key === "paid"
                    ? "bg-[var(--olive)] text-white"
                    : "bg-[var(--ink)] text-white"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {label}
            <span
              className="rounded-full px-1.5 py-0.5 text-xs"
              style={{
                background: paymentFilter === key ? "rgba(255,255,255,0.22)" : "var(--line)",
                color: paymentFilter === key ? "#fff" : "var(--muted)",
              }}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Calendar/List + Detail panel */}
      <div className={`grid gap-4 ${ledgerViewMode === "calendar" ? "xl:grid-cols-[1fr_420px] lg:grid-cols-[1fr_360px]" : ""}`}>
        {/* Calendar section */}
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)]/95 p-5 shadow-sm">
          {/* Month navigation */}
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={goToPrev}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-white text-lg font-black hover:border-[var(--clay)] transition-colors"
            >
              ‹
            </button>
            <div className="flex-1 text-center">
              <h2 className="text-xl font-black">{monthLabel}</h2>
              <p className="text-xs text-[var(--muted)]">
                {monthEntries.length}건{unpaidCount > 0 ? ` · 미입금 ${unpaidCount}건` : ""}
              </p>
            </div>
            <button
              onClick={goToNext}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-white text-lg font-black hover:border-[var(--clay)] transition-colors"
            >
              ›
            </button>
            <div className="ml-1 flex rounded-xl border border-[var(--line)] bg-white p-1">
              <button
                onClick={() => setLedgerViewMode("calendar")}
                className={`rounded-lg px-3 py-2 text-xs font-black ${
                  ledgerViewMode === "calendar" ? "bg-[var(--ink)] text-white" : "text-[var(--muted)]"
                }`}
              >
                달력 보기
              </button>
              <button
                onClick={() => setLedgerViewMode("list")}
                className={`rounded-lg px-3 py-2 text-xs font-black ${
                  ledgerViewMode === "list" ? "bg-[var(--clay)] text-white" : "text-[var(--muted)]"
                }`}
              >
                리스트 보기
              </button>
            </div>
          </div>

          {ledgerViewMode === "calendar" ? (
            <>
              {/* Day-of-week header */}
              <div className="mb-1 grid grid-cols-7 text-center">
                {DOW_KO.map((d, i) => (
                  <div
                    key={d}
                    className={`py-2 text-xs font-black ${
                      i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-[var(--muted)]"
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const dk = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayEntries = filteredEntriesByDate.get(dk) ?? [];
                  const isSelected = selectedDate === dk;
                  const isToday = dk === todayStr;
                  const totalAmt = dayEntries.reduce((s, e) => s + toNumber(e.amount ?? 0), 0);
                  const hasMine = dayEntries.some((e) => e.ownerCategory === "mine");
                  const hasBoss = dayEntries.some((e) => e.ownerCategory === "boss");
                  const hasDayOff = dayEntries.some((e) => e.isDayOff);
                  const dow = i % 7;
                  return (
                    <button
                      key={dk}
                      onClick={() => handleDayClick(day)}
                      className={`flex min-h-[56px] lg:min-h-[72px] flex-col rounded-xl border p-1 lg:p-1.5 text-left transition-all ${
                        isSelected
                          ? "border-[var(--clay)] bg-[#fff3df]"
                          : "border-[var(--line)] bg-white hover:border-[var(--clay)]/60 hover:bg-[#fffaf3]"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                          isToday
                            ? "bg-[var(--clay)] text-white"
                            : dow === 0
                              ? "text-red-500"
                              : dow === 6
                                ? "text-blue-500"
                                : ""
                        }`}
                      >
                        {day}
                      </span>
                      {dayEntries.length > 0 && (
                        <div className="mt-1 w-full space-y-0.5">
                          {totalAmt > 0 && (
                            <div
                              className={`truncate rounded px-1 py-0.5 text-[10px] font-black leading-tight ${
                                hasMine && hasBoss
                                  ? "bg-purple-100 text-purple-800"
                                  : hasMine
                                    ? "bg-amber-100 text-amber-800"
                                    : hasBoss
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {formatMoney(totalAmt)}
                            </div>
                          )}
                          {hasDayOff && (
                            <div className="rounded bg-stone-100 px-1 py-0.5 text-[10px] font-black text-stone-500">
                              휴무
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <PaintLedgerList
              entries={listEntries}
              onOpenEntry={(entry) => {
                setSelectedDate(entry.workDate?.slice(0, 10) ?? null);
                setModalEntry(entry);
                startEdit(entry);
              }}
            />
          )}
        </section>

        {/* Right panel */}
        {ledgerViewMode === "calendar" ? (
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)]/95 shadow-sm lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col min-h-[200px]">
          {rightPanel === "idle" && (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span className="text-5xl">📅</span>
              <p className="mt-4 text-lg font-black">날짜를 클릭하세요</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                캘린더에서 날짜를 선택하면<br />해당 일의 내역을 확인하고 수정할 수 있습니다.
              </p>
            </div>
          )}

          {(rightPanel === "detail" || rightPanel === "add") && selectedDate ? (
            <>
              {/* Panel header */}
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <div>
                  <p className="text-xs font-black text-[var(--muted)]">선택된 날짜</p>
                  <h3 className="text-lg font-black">
                    {selectedDate.slice(5, 7).replace(/^0/, "")}월{" "}
                    {selectedDate.slice(8).replace(/^0/, "")}일
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setRightPanel(rightPanel === "add" ? "detail" : "add");
                    setEditingId(null);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-black transition-colors ${
                    rightPanel === "add"
                      ? "bg-stone-200 text-stone-700"
                      : "bg-[var(--clay)] text-white"
                  }`}
                >
                  {rightPanel === "add" ? "✕ 취소" : "+ 항목 추가"}
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-auto p-5 space-y-4">
                {/* Add form */}
                {rightPanel === "add" && (
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      createEntry(new FormData(e.currentTarget), e.currentTarget);
                      setRightPanel("detail");
                    }}
                  >
                    <input type="hidden" name="workDate" value={selectedDate} />

                    {/* 구분 */}
                    <Field label="구분">
                      <select name="ownerCategory" defaultValue="mine" className="field-input">
                        <option value="mine">내꺼</option>
                        <option value="boss">신사장</option>
                        <option value="uncategorized">미분류 / 휴무</option>
                      </select>
                    </Field>

                    {/* 금액 */}
                    <Field label="금액">
                      <div className="relative">
                        <input
                          name="amount"
                          type="number"
                          step="1000"
                          placeholder="0"
                          className="field-input pr-10"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--muted)]">
                          원
                        </span>
                      </div>
                    </Field>

                    {/* 결제 여부 */}
                    <Field label="결제 여부">
                      <input
                        name="paymentStatus"
                        placeholder="예: 5월 30일 입금 / 카드"
                        className="field-input"
                      />
                    </Field>

                    <div className="h-px bg-[var(--line)]" />

                    {/* 현장/주소 */}
                    <Field label="현장 / 주소">
                      <input
                        name="siteAddress"
                        placeholder="예: 순녀 - 송도 101동 1001호"
                        className="field-input"
                      />
                    </Field>

                    {/* 사용자재 */}
                    <Field label="사용 자재">
                      <input
                        name="materialSpec"
                        placeholder="예: A / 진주 B / 수성 백색"
                        className="field-input"
                      />
                    </Field>

                    {/* 자재 상세 */}
                    <Field label="자재 상세">
                      <input
                        name="suppliedMaterials"
                        placeholder="샤르망 백색 1, 탄성백색 2..."
                        className="field-input"
                      />
                    </Field>

                    <div className="h-px bg-[var(--line)]" />

                    {/* 비용 3개 */}
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="인건비">
                        <div className="relative">
                          <input
                            name="laborCost"
                            type="number"
                            step="1000"
                            placeholder="0"
                            className="field-input pr-5 text-sm"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
                            원
                          </span>
                        </div>
                      </Field>
                      <Field label="기름">
                        <div className="relative">
                          <input
                            name="fuelCost"
                            type="number"
                            step="1000"
                            placeholder="0"
                            className="field-input pr-5 text-sm"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
                            원
                          </span>
                        </div>
                      </Field>
                      <Field label="자재비">
                        <div className="relative">
                          <input
                            name="materialCost"
                            type="number"
                            step="1000"
                            placeholder="0"
                            className="field-input pr-5 text-sm"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
                            원
                          </span>
                        </div>
                      </Field>
                    </div>

                    {/* 비고 */}
                    <Field label="비고">
                      <input
                        name="memo"
                        placeholder="영전 / 윤수 / 특이사항"
                        className="field-input"
                      />
                    </Field>

                    {/* 휴무 */}
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3.5">
                      <input name="isDayOff" type="checkbox" className="h-5 w-5 accent-[#b95f3b]" />
                      <span className="font-bold">휴무 행으로 표시</span>
                    </label>

                    <button className="h-14 w-full rounded-2xl bg-[var(--clay)] text-base font-black text-white">
                      등록하기
                    </button>
                  </form>
                )}

                {/* Detail entries */}
                {rightPanel === "detail" && (
                  <>
                    {selectedEntries.length === 0 ? (
                      <div className="rounded-2xl bg-white p-6 text-center">
                        <p className="text-[var(--muted)]">이 날 등록된 항목이 없습니다.</p>
                        <button
                          onClick={() => setRightPanel("add")}
                          className="mt-3 rounded-xl bg-[var(--clay)] px-5 py-2.5 text-sm font-black text-white"
                        >
                          첫 항목 추가하기
                        </button>
                      </div>
                    ) : (
                      selectedEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className={`rounded-2xl border bg-white transition-all ${
                            editingId === entry.id ? "border-amber-300" : "border-[var(--line)]"
                          } ${entry.isDayOff ? "opacity-60" : ""}`}
                        >
                          {editingId !== entry.id ? (
                            /* View card */
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                                        entry.ownerCategory === "mine"
                                          ? "bg-amber-100 text-amber-800"
                                          : entry.ownerCategory === "boss"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-stone-100 text-stone-600"
                                      }`}
                                    >
                                      {ownerLabel(entry.ownerCategory)}
                                    </span>
                                    {entry.isDayOff && (
                                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-black text-stone-500">
                                        휴무
                                      </span>
                                    )}
                                  </div>
                                  {entry.siteAddress && (
                                    <p className="mt-2 font-black leading-snug">{entry.siteAddress}</p>
                                  )}
                                  {entry.materialSpec && (
                                    <p className="mt-1 text-sm text-[var(--muted)]">{entry.materialSpec}</p>
                                  )}
                                  {entry.suppliedMaterials && (
                                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                                      {entry.suppliedMaterials}
                                    </p>
                                  )}
                                  {entry.memo && (
                                    <p className="mt-1 text-xs font-bold text-[var(--clay)]">{entry.memo}</p>
                                  )}
                                </div>
                                {toNumber(entry.amount ?? 0) > 0 && (
                                  <div className="shrink-0 text-right">
                                    <p className="text-xl font-black">
                                      {formatMoney(entry.amount ?? 0)}
                                      <span className="text-sm text-[var(--muted)]">원</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                              {(toNumber(entry.laborCost ?? 0) +
                                toNumber(entry.fuelCost ?? 0) +
                                toNumber(entry.materialCost ?? 0)) >
                                0 && (
                                <div className="mt-3 flex flex-wrap gap-3 rounded-xl bg-stone-50 px-3 py-2">
                                  {toNumber(entry.laborCost ?? 0) > 0 && (
                                    <span className="text-xs text-[var(--muted)]">
                                      인건비{" "}
                                      <strong>{formatMoney(entry.laborCost ?? 0)}</strong>원
                                    </span>
                                  )}
                                  {toNumber(entry.fuelCost ?? 0) > 0 && (
                                    <span className="text-xs text-[var(--muted)]">
                                      기름 <strong>{formatMoney(entry.fuelCost ?? 0)}</strong>원
                                    </span>
                                  )}
                                  {toNumber(entry.materialCost ?? 0) > 0 && (
                                    <span className="text-xs text-[var(--muted)]">
                                      자재비{" "}
                                      <strong>{formatMoney(entry.materialCost ?? 0)}</strong>원
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="mt-3">
                                <PaymentQuickAction entry={entry} updateEntry={updateEntry} />
                              </div>
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => startEdit(entry)}
                                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => deleteEntry(entry.id)}
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Edit form */
                            <div className="space-y-3 p-4">
                              <p className="text-xs font-black text-[var(--clay)]">항목 수정</p>
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="날짜">
                                  <input type="date" {...be("workDate")} className="field-input" />
                                </Field>
                                <Field label="구분">
                                  <select {...be("ownerCategory")} className="field-input">
                                    <option value="mine">내꺼</option>
                                    <option value="boss">신사장</option>
                                    <option value="uncategorized">미분류/휴무</option>
                                  </select>
                                </Field>
                              </div>
                              <Field label="금액">
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="1000"
                                    {...be("amount")}
                                    className="field-input pr-10"
                                  />
                                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--muted)]">
                                    원
                                  </span>
                                </div>
                              </Field>
                              <Field label="결제 여부">
                                <input
                                  {...be("paymentStatus")}
                                  placeholder="예: 5월 30일 입금"
                                  className="field-input"
                                />
                              </Field>
                              <Field label="현장 / 주소">
                                <input {...be("siteAddress")} className="field-input" />
                              </Field>
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="사용 자재">
                                  <input {...be("materialSpec")} className="field-input" />
                                </Field>
                                <Field label="자재 상세">
                                  <input {...be("suppliedMaterials")} className="field-input" />
                                </Field>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <Field label="인건비">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="1000"
                                      {...be("laborCost")}
                                      className="field-input pr-5 text-sm"
                                    />
                                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
                                      원
                                    </span>
                                  </div>
                                </Field>
                                <Field label="기름">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="1000"
                                      {...be("fuelCost")}
                                      className="field-input pr-5 text-sm"
                                    />
                                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
                                      원
                                    </span>
                                  </div>
                                </Field>
                                <Field label="자재비">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="1000"
                                      {...be("materialCost")}
                                      className="field-input pr-5 text-sm"
                                    />
                                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">
                                      원
                                    </span>
                                  </div>
                                </Field>
                              </div>
                              <Field label="비고">
                                <input {...be("memo")} className="field-input" />
                              </Field>
                              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={editData.isDayOff === "true"}
                                  onChange={(e) =>
                                    setEditData((prev) => ({
                                      ...prev,
                                      isDayOff: e.target.checked ? "true" : "false",
                                    }))
                                  }
                                  className="h-5 w-5 accent-[#b95f3b]"
                                />
                                <span className="font-bold">휴무 행으로 표시</span>
                              </label>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEdit()}
                                  disabled={isSaving}
                                  className="h-12 flex-1 rounded-xl bg-[var(--clay)] font-black text-white disabled:opacity-60"
                                >
                                  {isSaving ? "저장 중..." : "저장"}
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="h-12 rounded-xl bg-stone-100 px-5 font-black text-stone-700"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            </>
          ) : null}
        </section>
        ) : null}
      </div>

      {ledgerViewMode === "list" && modalEntry ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setModalEntry(null);
            setEditingId(null);
          }}
        >
          <div
            className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel)]/95 px-6 py-5 backdrop-blur">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--clay)]">Paint Ledger Detail</p>
                <h3 className="mt-1 text-2xl font-black">장부 상세 수정</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {formatLedgerDate(editData.workDate || modalEntry.workDate)} · {ownerLabel(editData.ownerCategory as PaintOwner)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalEntry(null);
                  setEditingId(null);
                }}
                className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-black text-[var(--muted)] hover:border-[var(--clay)] hover:text-[var(--ink)]"
              >
                닫기
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="날짜">
                  <input type="date" {...be("workDate")} className="field-input" />
                </Field>
                <Field label="구분">
                  <select {...be("ownerCategory")} className="field-input">
                    <option value="mine">내꺼</option>
                    <option value="boss">신사장</option>
                    <option value="uncategorized">미분류/휴무</option>
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="금액">
                  <div className="relative">
                    <input type="number" step="1000" {...be("amount")} className="field-input pr-10" />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--muted)]">
                      원
                    </span>
                  </div>
                </Field>
                <Field label="결제 여부">
                  <input {...be("paymentStatus")} placeholder="예: 5월 30일 입금" className="field-input" />
                </Field>
              </div>

              <Field label="현장 / 주소">
                <input {...be("siteAddress")} className="field-input" />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="사용 자재">
                  <input {...be("materialSpec")} className="field-input" />
                </Field>
                <Field label="비고">
                  <input {...be("memo")} className="field-input" />
                </Field>
              </div>

              <Field label="자재 상세">
                <textarea {...be("suppliedMaterials")} rows={3} className="field-input resize-none" />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="인건비">
                  <div className="relative">
                    <input type="number" step="1000" {...be("laborCost")} className="field-input pr-10" />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--muted)]">
                      원
                    </span>
                  </div>
                </Field>
                <Field label="기름">
                  <div className="relative">
                    <input type="number" step="1000" {...be("fuelCost")} className="field-input pr-10" />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--muted)]">
                      원
                    </span>
                  </div>
                </Field>
                <Field label="자재비">
                  <div className="relative">
                    <input type="number" step="1000" {...be("materialCost")} className="field-input pr-10" />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[var(--muted)]">
                      원
                    </span>
                  </div>
                </Field>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <input
                  type="checkbox"
                  checked={editData.isDayOff === "true"}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      isDayOff: e.target.checked ? "true" : "false",
                    }))
                  }
                  className="h-5 w-5 accent-[#b95f3b]"
                />
                <span className="font-bold">휴무 행으로 표시</span>
              </label>
            </div>

            <div className="sticky bottom-0 flex flex-col gap-2 border-t border-[var(--line)] bg-[var(--panel)]/95 px-6 py-4 backdrop-blur sm:flex-row">
              <button
                type="button"
                onClick={() => saveEdit(true)}
                disabled={isSaving || !editingId}
                className="h-12 flex-1 rounded-2xl bg-[var(--clay)] font-black text-white disabled:opacity-60"
              >
                {isSaving ? "저장 중..." : "수정 저장"}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteEntry(modalEntry.id);
                  setModalEntry(null);
                  setEditingId(null);
                }}
                className="h-12 rounded-2xl border border-red-200 bg-red-50 px-6 font-black text-red-700 hover:bg-red-100"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalEntry(null);
                  setEditingId(null);
                }}
                className="h-12 rounded-2xl bg-stone-100 px-6 font-black text-stone-700 hover:bg-stone-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WorkerView({
  currentUser,
  todaySchedules,
  schedules,
  allUsers,
  sites,
  payroll,
  notices,
  workerMessage,
  formMessage,
  isPending,
  isSubmittingSchedule,
  handleAttendance,
  createWorkLog,
  createSchedule,
  paintEntries,
  createPaintEntry,
  managerMessage,
  updatePaintEntry,
  deletePaintEntry,
}: {
  currentUser: Pick<User, "id" | "name" | "role">;
  todaySchedules: Schedule[];
  schedules: Schedule[];
  allUsers: User[];
  sites: Site[];
  payroll?: Payroll;
  notices: Notice[];
  workerMessage: string;
  formMessage: string;
  isPending: boolean;
  isSubmittingSchedule: boolean;
  handleAttendance: (kind: "check-in" | "check-out", schedule?: Schedule) => void;
  createWorkLog: (formData: FormData, form?: HTMLFormElement) => void;
  createSchedule: (formData: FormData, form?: HTMLFormElement, workerWages?: Record<string, number>) => void;
  paintEntries: PaintLedgerEntry[];
  createPaintEntry: (formData: FormData, form?: HTMLFormElement) => void;
  managerMessage: string;
  updatePaintEntry: (id: string, data: Record<string, unknown>) => Promise<boolean>;
  deletePaintEntry: (id: string) => void;
}) {
  const primarySchedule = todaySchedules[0] ?? schedules[0];
  const [workerTab, setWorkerTab] = useState<"home" | "schedule" | "ledger">("home");

  return (
    <div className="grid gap-4">
      <nav className="grid gap-2 grid-cols-3">
        {(["home", "schedule", "ledger"] as const).map((tab) => {
          const labels = { home: "오늘 일정", schedule: "일정 등록", ledger: "내 장부" };
          return (
            <button
              key={tab}
              onClick={() => setWorkerTab(tab)}
              className={`h-12 rounded-2xl border text-sm font-black ${workerTab === tab ? "border-[var(--clay)] bg-[var(--clay)] text-white" : "border-[var(--line)] bg-white"}`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </nav>
      {workerTab === "schedule" ? (
        <WorkerScheduleForm
          currentUser={currentUser}
          allUsers={allUsers}
          sites={sites}
          formMessage={formMessage}
          isPending={isSubmittingSchedule}
          createSchedule={createSchedule}
        />
      ) : workerTab === "ledger" ? (
        <PaintLedgerView
          entries={paintEntries}
          managerMessage={managerMessage}
          createEntry={createPaintEntry}
          updateEntry={updatePaintEntry}
          deleteEntry={deletePaintEntry}
        />
      ) : (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-[2rem] border border-[var(--line)] bg-[#1f2a1b] p-5 text-white shadow-2xl">
        <p className="text-sm font-bold text-[#d7c9a6]">일반사원 모바일 홈</p>
        <h2 className="mt-3 text-3xl font-black">오늘 내 일정</h2>
        {workerMessage ? <p className="mt-4 rounded-2xl bg-white/10 p-3 font-bold">{workerMessage}</p> : null}
        <div className="mt-5 space-y-3">
          {todaySchedules.length ? (
            todaySchedules.map((schedule) => (
              <WorkerTodayCard
                key={schedule.id}
                schedule={schedule}
                isPending={isPending}
                onAttendance={handleAttendance}
              />
            ))
          ) : (
            <div className="rounded-3xl bg-white/10 p-5">오늘 배정된 일정이 없습니다.</div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <MiniStat label="내 공수" value={formatWorkUnit(payroll?.totalWorkUnit ?? 0)} />
          <MiniStat label="일당" value={formatMoney(payroll?.dailyWage ?? 0)} />
          <MiniStat label="예상" value={formatMoney(payroll?.totalAmount ?? 0)} />
        </div>
      </section>

      <section className="grid gap-4">
        <Panel title="빠른 작업일지" action={currentUser.name}>
          {primarySchedule ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                createWorkLog(new FormData(event.currentTarget), event.currentTarget);
              }}
            >
              <input type="hidden" name="siteId" value={primarySchedule.site.id} />
              <input type="hidden" name="scheduleId" value={primarySchedule.id} />
              <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-black text-[var(--clay)]">{primarySchedule.site.name}</p>
                <p className="mt-1 font-black">{primarySchedule.title}</p>
              </div>
              <Field label="작업 내용">
                <textarea
                  name="content"
                  required
                  placeholder="예: 철거 구간 정리 및 폐기물 반출 완료"
                  className="field-input min-h-24 py-3"
                />
              </Field>
              <Field label="특이사항">
                <textarea name="issues" placeholder="현장 이슈가 있으면 적어주세요." className="field-input min-h-20 py-3" />
              </Field>
              <Field label="자재 요청">
                <input name="materialRequest" placeholder="예: 퍼티 2박스, 커버링 테이프" className="field-input" />
              </Field>
              <button disabled={isPending} className="h-14 rounded-2xl bg-[var(--clay)] text-lg font-black text-white">
                {isPending ? "저장 중..." : "작업일지 저장"}
              </button>
            </form>
          ) : (
            <p className="rounded-2xl bg-white p-4 text-[var(--muted)]">배정된 일정이 없어 일지를 작성할 수 없습니다.</p>
          )}
        </Panel>
        <Panel title="내 전체 일정" action="조회 전용">
          <div className="space-y-3">
            {schedules.slice(0, 12).map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        </Panel>
        <Panel title="공지" action="최근">
          <div className="grid gap-3 sm:grid-cols-2">
            {notices.map((notice) => (
              <div key={notice.id} className="rounded-2xl bg-white p-4">
                <p className="font-black">{notice.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{notice.message}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
      )}
    </div>
  );
}

// ─── Worker Schedule Form ─────────────────────────────────────────────────────

function WorkerScheduleForm({
  currentUser,
  allUsers,
  sites,
  formMessage,
  isPending,
  createSchedule,
}: {
  currentUser: Pick<User, "id" | "name" | "role">;
  allUsers: User[];
  sites: Site[];
  formMessage: string;
  isPending: boolean;
  createSchedule: (formData: FormData, form?: HTMLFormElement, workerWages?: Record<string, number>) => void;
}) {
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? "");
  const [workLocation, setWorkLocation] = useState("");
  const [workerWages, setWorkerWages] = useState<Record<string, number>>({});
  const otherUsers = allUsers.filter((u) => u.id !== currentUser.id && u.role !== "admin");

  React.useEffect(() => {
    if (formMessage === "일정이 등록되었습니다.") {
      setWorkLocation("");
      setSelectedSiteId(sites[0]?.id ?? "");
      setWorkerWages({});
    }
  }, [formMessage]);

  function openDaumPostcode() {
    const win = window as unknown as { daum?: { Postcode: new (opts: { oncomplete: (data: { roadAddress: string }) => void }) => { open: () => void } } };
    function run() { new win.daum!.Postcode({ oncomplete: (data) => setWorkLocation(data.roadAddress) }).open(); }
    if (win.daum?.Postcode) { run(); return; }
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = run;
    document.head.appendChild(script);
  }

  return (
    <Panel title="현장 일정 등록" action={currentUser.name}>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          // always include self as worker
          if (!fd.getAll("workerIds").includes(currentUser.id)) {
            fd.append("workerIds", currentUser.id);
          }
          createSchedule(fd, e.currentTarget, workerWages);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="작업일">
            <input name="workDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="field-input" required />
          </Field>
          <Field label="상태">
            <select name="status" defaultValue="planned" className="field-input">
              <option value="planned">예정</option>
              <option value="in_progress">진행중</option>
              <option value="completed">완료</option>
            </select>
          </Field>
        </div>
        <Field label="현장">
          <SiteCombobox sites={sites} value={selectedSiteId} onChange={setSelectedSiteId} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="작업 위치">
            <div className="flex gap-2">
              <input name="workLocation" value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} placeholder="상세 위치" className="field-input flex-1" />
              <button type="button" onClick={openDaumPostcode} className="shrink-0 rounded-xl border border-[var(--line)] bg-white px-3 text-xs font-black text-[var(--muted)]">주소검색</button>
            </div>
          </Field>
          <Field label="작업 구분">
            <select name="workType" defaultValue="interior" className="field-input">
              <option value="demolition">철거</option>
              <option value="carpentry">목공</option>
              <option value="wallpaper">도배</option>
              <option value="painting">도장</option>
              <option value="flooring">바닥</option>
              <option value="electric">전기</option>
              <option value="interior">기타 인테리어</option>
            </select>
          </Field>
        </div>
        <Field label="일정 제목">
          <input name="title" placeholder="예: 주방 도장 작업" className="field-input" required />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="총 계약금액">
            <div className="flex items-center gap-2">
              <input name="totalAmount" type="number" min="0" step="10000" placeholder="예: 500000" className="field-input flex-1" />
              <span className="text-sm text-[var(--muted)]">원</span>
            </div>
          </Field>
          <Field label="내 수령액 (본인)">
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" step="10000" placeholder="내가 가져가는 금액"
                className="field-input flex-1"
                onChange={(e) => setWorkerWages((prev) => ({ ...prev, [currentUser.id]: Number(e.target.value) }))}
              />
              <span className="text-sm text-[var(--muted)]">원</span>
            </div>
          </Field>
        </div>
        <Field label="설명">
          <textarea name="description" placeholder="작업 내용, 특이사항" className="field-input py-3" rows={2} />
        </Field>
        {otherUsers.length > 0 && (
          <div>
            <p className="text-sm font-black text-[var(--muted)]">같이 가는 작업자 (선택)</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">각자 수령액이 다를 수 있습니다</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {otherUsers.map((u) => {
                const checked = u.id in workerWages;
                return (
                  <div key={u.id} className={`rounded-2xl border p-3 ${checked ? "border-[var(--clay)] bg-[#fff8f0]" : "border-[var(--line)] bg-white"}`}>
                    <label className="flex cursor-pointer items-center gap-3 font-bold">
                      <input
                        name="workerIds" type="checkbox" value={u.id} checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setWorkerWages((prev) => ({ ...prev, [u.id]: toNumber(u.dailyWage) }));
                          else setWorkerWages((prev) => { const n = { ...prev }; delete n[u.id]; return n; });
                        }}
                        className="h-5 w-5 accent-[#b95f3b]"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block">{u.name}</span>
                        <span className="block truncate text-xs text-[var(--muted)]">{u.phone || "전화번호 미등록"}</span>
                      </span>
                      <span className="text-xs text-[var(--muted)]">{u.role === "leader" ? "반장" : "작업자"}</span>
                    </label>
                    {checked && (
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs font-black text-[var(--muted)]">수령액</label>
                        <input
                          type="number" min="0" step="10000"
                          value={workerWages[u.id] ?? ""}
                          onChange={(e) => setWorkerWages((prev) => ({ ...prev, [u.id]: Number(e.target.value) }))}
                          className="field-input flex-1 h-9 text-sm"
                          placeholder={String(toNumber(u.dailyWage))}
                        />
                        <span className="text-xs text-[var(--muted)]">원</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {formMessage ? <p className="rounded-2xl bg-[#fff3df] p-3 font-bold text-[var(--clay)]">{formMessage}</p> : null}
        <button disabled={isPending} className="h-14 rounded-2xl bg-[var(--clay)] text-lg font-black text-white">
          {isPending ? "등록 중..." : "일정 등록"}
        </button>
      </form>
    </Panel>
  );
}

// ─── Personal Job Ledger ──────────────────────────────────────────────────────

function PersonalJobLedger({
  currentUserId,
  schedules,
  paintEntries = [],
  createPaintEntry,
}: {
  currentUserId: string;
  schedules: Schedule[];
  paintEntries?: PaintLedgerEntry[];
  createPaintEntry?: (formData: FormData, form?: HTMLFormElement) => void;
}) {
  const mySchedules = schedules.filter((s) =>
    s.workers.some((w) => w.user.id === currentUserId)
  );
  const [addEntryOpen, setAddEntryOpen] = useState(false);

  const totalEarnings = mySchedules.reduce((sum, s) => {
    const me = s.workers.find((w) => w.user.id === currentUserId);
    return sum + (me?.wage != null ? toNumber(me.wage) : 0);
  }, 0);

  const paintTotal = paintEntries.reduce((sum, e) => sum + (e.amount != null ? toNumber(e.amount) : 0), 0);

  const myCreatedSchedules = schedules.filter((s) => s.createdById === currentUserId);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-[var(--ink)] p-4 text-white">
          <p className="text-xs text-white/60">배정 수령 예상</p>
          <p className="mt-1 text-xl font-black">{formatMoney(totalEarnings)}원</p>
        </div>
        <div className="rounded-2xl bg-[var(--clay)] p-4 text-white">
          <p className="text-xs text-white/60">수기 장부 합계</p>
          <p className="mt-1 text-xl font-black">{formatMoney(paintTotal)}원</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <p className="text-xs text-[var(--muted)]">배정된 작업</p>
          <p className="mt-1 text-2xl font-black">{mySchedules.length}건</p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <p className="text-xs text-[var(--muted)]">내가 등록한 일정</p>
          <p className="mt-1 text-2xl font-black">{myCreatedSchedules.length}건</p>
        </div>
      </div>

      <Panel title="내 작업 내역" action="수령액 기준">
        {mySchedules.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)]">조회 기간 내 배정된 작업이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {mySchedules.map((s) => {
              const me = s.workers.find((w) => w.user.id === currentUserId);
              const myWage = me?.wage != null ? toNumber(me.wage) : null;
              const total = s.totalAmount != null ? toNumber(s.totalAmount) : null;
              return (
                <div key={s.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--muted)]">{s.workDate.slice(0, 10)} · {s.site.name}</p>
                      <p className="mt-1 font-black">{s.title}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${statusTone[s.status]}`}>{statusLabel[s.status]}</span>
                  </div>
                  <div className="mt-3 flex gap-3">
                    <div className="flex-1 rounded-xl bg-[#fff8f0] px-3 py-2">
                      <p className="text-xs text-[var(--muted)]">내 수령액</p>
                      <p className="font-black text-[var(--clay)]">{myWage != null ? `${formatMoney(myWage)}원` : "미입력"}</p>
                    </div>
                    {total != null && (
                      <div className="flex-1 rounded-xl bg-stone-50 px-3 py-2">
                        <p className="text-xs text-[var(--muted)]">총 계약금액</p>
                        <p className="font-black">{formatMoney(total)}원</p>
                      </div>
                    )}
                  </div>
                  {s.workers.length > 1 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.workers.filter((w) => w.user.id !== currentUserId).map((w) => (
                        <span key={w.user.id} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                          {w.user.name}{w.wage != null ? ` ${formatMoney(w.wage)}원` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {myCreatedSchedules.length > 0 && (
        <Panel title="내가 등록한 일정" action="등록자 기준">
          <div className="space-y-3">
            {myCreatedSchedules.map((s) => {
              const total = s.totalAmount != null ? toNumber(s.totalAmount) : null;
              const workerCosts = s.workers.reduce((sum, w) => sum + (w.wage != null ? toNumber(w.wage) : 0), 0);
              return (
                <div key={s.id} className="rounded-2xl border border-[var(--line)] bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-[var(--muted)]">{s.workDate.slice(0, 10)} · {s.site.name}</p>
                      <p className="mt-1 font-black">{s.title}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${statusTone[s.status]}`}>{statusLabel[s.status]}</span>
                  </div>
                  {total != null && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-[#fff8f0] px-3 py-2">
                        <p className="text-xs text-[var(--muted)]">총 계약금액</p>
                        <p className="font-black text-[var(--clay)]">{formatMoney(total)}원</p>
                      </div>
                      <div className="rounded-xl bg-stone-50 px-3 py-2">
                        <p className="text-xs text-[var(--muted)]">작업자 지급 합계</p>
                        <p className="font-black">{formatMoney(workerCosts)}원</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* 수기 장부 섹션 */}
      <Panel title="수기 장부" action={
        <button type="button" onClick={() => setAddEntryOpen((o) => !o)} className="text-xs font-black text-[var(--clay)]">
          {addEntryOpen ? "닫기" : "+ 추가"}
        </button>
      }>
        {addEntryOpen && createPaintEntry && (
          <form
            className="mb-4 grid gap-3 rounded-2xl bg-stone-50 p-4"
            onSubmit={(e) => { e.preventDefault(); createPaintEntry(new FormData(e.currentTarget), e.currentTarget); setAddEntryOpen(false); }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="날짜">
                <input name="workDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="field-input" />
              </Field>
              <Field label="금액">
                <div className="flex items-center gap-2">
                  <input name="amount" type="number" min="0" step="10000" placeholder="0" className="field-input flex-1" />
                  <span className="text-sm text-[var(--muted)]">원</span>
                </div>
              </Field>
            </div>
            <Field label="현장/내용">
              <input name="siteAddress" placeholder="예: 송파 오피스 도장" className="field-input" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="결제상태">
                <input name="paymentStatus" placeholder="예: 완료, 미수금" className="field-input" />
              </Field>
              <Field label="메모">
                <input name="memo" placeholder="특이사항" className="field-input" />
              </Field>
            </div>
            <input type="hidden" name="ownerCategory" value="mine" />
            <button className="h-11 rounded-2xl bg-[var(--clay)] font-black text-white text-sm">장부 추가</button>
          </form>
        )}
        {paintEntries.length === 0 ? (
          <p className="p-4 text-sm text-[var(--muted)]">수기 장부 항목이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {paintEntries.slice().reverse().map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--muted)]">{e.workDate ? e.workDate.slice(0, 10) : "날짜 없음"}</p>
                  <p className="font-bold truncate">{e.siteAddress || e.memo || "내용 없음"}</p>
                  {e.paymentStatus && <p className="text-xs text-[var(--muted)]">{e.paymentStatus}</p>}
                </div>
                <p className="shrink-0 ml-4 font-black text-[var(--clay)]">
                  {e.amount != null ? `${formatMoney(e.amount)}원` : "-"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function WorkerTodayCard({
  schedule,
  isPending,
  onAttendance,
}: {
  schedule: Schedule;
  isPending: boolean;
  onAttendance: (kind: "check-in" | "check-out", schedule?: Schedule) => void;
}) {
  return (
    <article className="rounded-3xl bg-[#fff8e8] p-5 text-[var(--ink)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[var(--clay)]">오늘 배정 현장</p>
          <h3 className="mt-2 text-2xl font-black">{schedule.site.name}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{schedule.title}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone[schedule.status]}`}>
          {statusLabel[schedule.status]}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          disabled={isPending}
          onClick={() => onAttendance("check-in", schedule)}
          className="h-16 rounded-2xl bg-[var(--olive)] text-lg font-black text-white disabled:opacity-60"
        >
          출근 체크
        </button>
        <button
          disabled={isPending}
          onClick={() => onAttendance("check-out", schedule)}
          className="h-16 rounded-2xl bg-[var(--ink)] text-lg font-black text-white disabled:opacity-60"
        >
          퇴근 체크
        </button>
      </div>
    </article>
  );
}

function ScheduleCard({
  schedule,
  editable = false,
  onStatusChange,
  onDelete,
  onUpdateSite,
}: {
  schedule: Schedule;
  editable?: boolean;
  onStatusChange?: (scheduleId: string, status: Status) => void;
  onDelete?: (scheduleId: string) => void;
  onUpdateSite?: (siteId: string, data: Record<string, unknown>) => Promise<boolean>;
}) {
  const [showMap, setShowMap] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMsg, setGpsMsg] = useState("");

  const { site } = schedule;
  const hasGps = site.latitude != null && site.longitude != null;
  const lat = hasGps ? toNumber(site.latitude!) : null;
  const lng = hasGps ? toNumber(site.longitude!) : null;

  const mapQuery = encodeURIComponent(
    hasGps ? `${lat},${lng}` : (site.address ?? site.name),
  );
  const kakaoQuery = encodeURIComponent(site.address ?? site.name);

  async function captureGps() {
    if (!onUpdateSite) return;
    if (!navigator.geolocation) {
      setGpsMsg("이 브라우저는 GPS를 지원하지 않습니다.");
      return;
    }
    setGpsLoading(true);
    setGpsMsg("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const ok = await onUpdateSite(site.id, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGpsLoading(false);
        setGpsMsg(ok ? `GPS 저장 완료 (±${Math.round(pos.coords.accuracy)}m)` : "저장 실패");
        if (ok) setShowMap(true);
      },
      (err) => {
        setGpsLoading(false);
        setGpsMsg(err.code === 1 ? "위치 권한이 거부되었습니다." : "GPS 수신 실패");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white overflow-hidden">
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-black leading-snug">{schedule.title}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatDate(schedule.workDate)} · {formatTimeRange(schedule)} · {formatWorkUnit(schedule.estimatedWorkUnit)}공수
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusTone[schedule.status]}`}>
            {statusLabel[schedule.status]}
          </span>
        </div>

        {/* Site info block */}
        <div className="mt-3 rounded-xl bg-stone-50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[var(--clay)]">현장</p>
              <p className="mt-0.5 font-black">{site.name}</p>
              {site.address && (
                <p className="mt-1 text-sm text-[var(--muted)]">{site.address}</p>
              )}
              {schedule.workLocation && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">
                    건물 상세
                  </span>
                  <span className="text-sm font-bold">{schedule.workLocation}</span>
                </div>
              )}
              {site.clientName && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  담당: {site.clientName}
                  {site.clientPhone ? ` · ${site.clientPhone}` : ""}
                </p>
              )}
            </div>
            {/* Map toggle button */}
            <button
              onClick={() => setShowMap((v) => !v)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-black transition-colors ${
                showMap
                  ? "bg-[var(--ink)] text-white"
                  : hasGps
                    ? "border border-[var(--clay)] bg-white text-[var(--clay)]"
                    : "border border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              {showMap ? "지도 닫기" : hasGps ? "📍 지도" : "🗺 지도"}
            </button>
          </div>

          {/* GPS status / capture */}
          {editable && (
            <div className="mt-2 flex items-center gap-2">
              {hasGps ? (
                <span className="text-xs text-[var(--olive)] font-bold">
                  GPS: {lat?.toFixed(5)}, {lng?.toFixed(5)}
                </span>
              ) : (
                <span className="text-xs text-[var(--muted)]">GPS 미설정</span>
              )}
              <button
                onClick={captureGps}
                disabled={gpsLoading}
                className="ml-auto rounded-lg border border-[var(--line)] bg-white px-3 py-1 text-xs font-black text-[var(--ink)] disabled:opacity-50"
              >
                {gpsLoading ? "수신 중…" : hasGps ? "GPS 재설정" : "현재 위치로 GPS 설정"}
              </button>
            </div>
          )}
          {gpsMsg && <p className="mt-1 text-xs font-bold text-[var(--clay)]">{gpsMsg}</p>}
        </div>

        {/* Map embed + links */}
        {showMap && (
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--line)]">
            {hasGps && lat && lng ? (
              <iframe
                title="현장 위치"
                className="h-52 w-full border-0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.003},${lat - 0.003},${lng + 0.003},${lat + 0.003}&layer=mapnik&marker=${lat},${lng}`}
              />
            ) : (
              <div className="flex h-20 items-center justify-center bg-stone-50 text-sm text-[var(--muted)]">
                GPS 좌표가 없습니다. 위 &apos;현재 위치로 GPS 설정&apos;으로 등록하세요.
              </div>
            )}
            <div className="flex gap-2 border-t border-[var(--line)] bg-stone-50 p-2">
              <a
                href={`https://map.kakao.com/link/search/${kakaoQuery}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-lg bg-[#FAE100] py-2 text-center text-xs font-black text-[#3A1D1D]"
              >
                카카오맵
              </a>
              <a
                href={`https://map.naver.com/?query=${kakaoQuery}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-lg bg-[#03C75A] py-2 text-center text-xs font-black text-white"
              >
                네이버지도
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-lg bg-white py-2 text-center text-xs font-black text-[var(--ink)] border border-[var(--line)]"
              >
                Google Maps
              </a>
            </div>
          </div>
        )}

        {schedule.totalAmount != null && (
          <div className="mt-3 flex gap-3">
            <div className="rounded-xl bg-[#fff8f0] px-3 py-1.5">
              <span className="text-xs text-[var(--muted)]">총금액 </span>
              <span className="text-sm font-black text-[var(--clay)]">{formatMoney(schedule.totalAmount)}원</span>
            </div>
            {schedule.workers.some((w) => w.wage != null) && (
              <div className="rounded-xl bg-stone-50 px-3 py-1.5">
                <span className="text-xs text-[var(--muted)]">지급합계 </span>
                <span className="text-sm font-black">
                  {formatMoney(schedule.workers.reduce((s, w) => s + (w.wage != null ? toNumber(w.wage) : 0), 0))}원
                </span>
              </div>
            )}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {schedule.workers.length ? schedule.workers.map((w) => (
            <span key={w.user.id} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700">
              {w.user.name}{w.wage != null ? ` · ${formatMoney(w.wage)}원` : ""}
            </span>
          )) : <span className="text-sm text-[var(--muted)]">배정 없음</span>}
        </div>
      </div>

      {editable ? (
        <div className="grid gap-2 border-t border-[var(--line)] p-3 sm:grid-cols-[1fr_auto]">
          <select
            value={schedule.status}
            onChange={(event) => onStatusChange?.(schedule.id, event.target.value as Status)}
            className="field-input min-h-11"
          >
            <option value="planned">예정</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
            <option value="paused">보류</option>
          </select>
          <button
            onClick={() => onDelete?.(schedule.id)}
            className="min-h-11 rounded-2xl border border-red-200 bg-red-50 px-4 font-black text-red-700"
          >
            삭제
          </button>
        </div>
      ) : null}
    </article>
  );
}

function formatTimeRange(schedule: Schedule) {
  const start = schedule.startTime ? formatTime(schedule.startTime) : "시작 미정";
  const end = schedule.endTime ? formatTime(schedule.endTime) : "종료 미정";
  return `${start}~${end}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 5);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function Kpi({ title, value, suffix, warn = false }: { title: string; value: number; suffix: string; warn?: boolean }) {
  return (
    <article className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-sm">
      <p className="text-sm font-bold text-[var(--muted)]">{title}</p>
      <p className={`mt-3 text-4xl font-black tracking-[-0.06em] ${warn ? "text-[var(--clay)]" : ""}`}>
        {value}
        <span className="ml-1 text-lg tracking-normal text-[var(--muted)]">{suffix}</span>
      </p>
    </article>
  );
}

function PaintKpi({
  label,
  value,
  warn = false,
  accent = false,
}: {
  label: string;
  value: NumericValue;
  warn?: boolean;
  accent?: boolean;
}) {
  const bg = warn ? "bg-red-50" : accent ? "bg-[var(--clay)]" : "bg-white";
  const text = warn ? "text-red-700" : accent ? "text-white" : "text-[var(--ink)]";
  const muted = warn ? "text-red-400" : accent ? "text-white/70" : "text-[var(--muted)]";
  return (
    <article className={`rounded-2xl p-4 ${bg}`}>
      <p className={`text-sm font-black ${muted}`}>{label}</p>
      <p className={`mt-2 text-2xl font-black ${text}`}>{formatMoney(value)}원</p>
    </article>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-3 font-black text-[var(--ink)]">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-3 text-[var(--ink)]">{children}</td>;
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)]/95 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black tracking-[-0.03em]">{title}</h2>
        <span className="rounded-full bg-[#e9dac2] px-3 py-1 text-xs font-black text-[var(--muted)]">{action}</span>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[var(--muted)]">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs text-white/55">{label}</p>
      <p className="mt-1 truncate text-lg font-black">{value}</p>
    </div>
  );
}

function toNumber(value: NumericValue) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatWorkUnit(value: NumericValue) {
  return toNumber(value).toFixed(1);
}

function formatMoney(value: NumericValue) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(toNumber(value)));
}

function formatMoneyOrBlank(value: NumericValue | null) {
  const numberValue = toNumber(value ?? 0);
  return numberValue > 0 ? `₩${formatMoney(numberValue)}` : "";
}

function formatLedgerDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(5, 10);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const dow = DOW_KO[date.getUTCDay()];
  return `${month}월 ${day}일 (${dow})`;
}

function monthKey(value: string | null) {
  return value ? value.slice(0, 7) : "";
}

function ownerLabel(value: PaintOwner | null) {
  if (value === "mine") return "내꺼";
  if (value === "boss") return "신사장";
  return "미분류";
}

function isPaintUnpaid(entry: PaintLedgerEntry) {
  const hasAmount = toNumber(entry.amount ?? 0) > 0;
  const isAutoFromSchedule = entry.memo?.startsWith("현장일정 자동등록:");
  return !entry.paymentStatus && (hasAmount || isAutoFromSchedule);
}

function summarizePaintLedger(entries: PaintLedgerEntry[]) {
  const mineRevenue = entries
    .filter((entry) => entry.ownerCategory === "mine")
    .reduce((sum, entry) => sum + toNumber(entry.amount ?? 0), 0);
  const bossRevenue = entries
    .filter((entry) => entry.ownerCategory === "boss")
    .reduce((sum, entry) => sum + toNumber(entry.amount ?? 0), 0);
  const laborCost = entries.reduce((sum, entry) => sum + toNumber(entry.laborCost ?? 0), 0);
  const fuelCost = entries.reduce((sum, entry) => sum + toNumber(entry.fuelCost ?? 0), 0);
  const materialCost = entries.reduce((sum, entry) => sum + toNumber(entry.materialCost ?? 0), 0);
  const expenseTotal = laborCost + fuelCost + materialCost;
  const grossRevenue = mineRevenue + bossRevenue;
  const bossTax = bossRevenue * 0.033;
  const bossAfterTax = bossRevenue * 0.967;

  return {
    mineRevenue,
    bossRevenue,
    grossRevenue,
    laborCost,
    fuelCost,
    materialCost,
    expenseTotal,
    bossTax,
    bossAfterTax,
    netProfit: grossRevenue - expenseTotal,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

function isSameDate(value: string, target: string) {
  return value.slice(0, 10) === target.slice(0, 10);
}
