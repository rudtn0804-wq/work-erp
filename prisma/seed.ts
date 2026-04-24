import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb((process.env.DATABASE_URL ?? "").replace(/^mysql:\/\//, "mariadb://")),
});

function dateFromToday(offset: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
}

function yearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  await prisma.notification.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.workLogPhoto.deleteMany();
  await prisma.workLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.scheduleWorker.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password1234", 10);

  const admin = await prisma.user.create({
    data: {
      name: "김관리",
      email: "admin@field.local",
      phone: "010-1000-0001",
      passwordHash,
      role: "admin",
      dailyWage: 0,
    },
  });

  const leader = await prisma.user.create({
    data: {
      name: "박반장",
      email: "leader@field.local",
      phone: "010-1000-0002",
      passwordHash,
      role: "leader",
      dailyWage: 220000,
    },
  });

  const workers = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      prisma.user.create({
        data: {
          name: `작업자${index + 1}`,
          email: `worker${index + 1}@field.local`,
          phone: `010-20${String(index + 1).padStart(2, "0")}-0000`,
          passwordHash,
          role: "worker",
          dailyWage: 160000 + index * 5000,
        },
      }),
    ),
  );

  const crew = [leader, ...workers];
  const siteNames = [
    ["마포 래미안 1203호", "이민서", "서울 마포구 백범로 12"],
    ["분당 정자동 주방 리모델링", "최도윤", "성남시 분당구 정자일로 88"],
    ["송파 오피스 원상복구", "강서준", "서울 송파구 올림픽로 300"],
    ["일산 카페 목공 현장", "오하린", "고양시 일산동구 중앙로 1060"],
    ["구로 사무실 도장 보수", "정유진", "서울 구로구 디지털로 26"],
  ] as const;

  const sites = await Promise.all(
    siteNames.map(([name, clientName, address], index) =>
      prisma.site.create({
        data: {
          name,
          clientName,
          clientPhone: `010-30${index + 1}0-44${index + 1}${index + 1}`,
          address,
          startDate: dateFromToday(index - 5),
          endDate: dateFromToday(index + 20),
          status: index === 4 ? "planned" : index === 2 ? "paused" : "in_progress",
          memo: "현장 진입 전 관리실 연락 필요",
          createdById: admin.id,
        },
      }),
    ),
  );

  const schedules = [];
  for (let day = -10; day < 20; day += 1) {
    const site = sites[Math.abs(day) % sites.length];
    const schedule = await prisma.schedule.create({
      data: {
        siteId: site.id,
        title: `${site.name.split(" ")[0]} ${day % 3 === 0 ? "마감" : day % 3 === 1 ? "목공" : "도장"} 작업`,
        description: "자재 확인 후 작업 전후 사진을 남겨주세요.",
        workDate: dateFromToday(day),
        status: day < -2 ? "completed" : day === 3 ? "paused" : day <= 1 ? "in_progress" : "planned",
        createdById: admin.id,
        workers: {
          create: crew.slice(day % 2 === 0 ? 0 : 1, day % 2 === 0 ? 4 : 5).map((user) => ({
            userId: user.id,
          })),
        },
      },
    });
    schedules.push(schedule);
  }

  for (let day = -20; day <= 0; day += 1) {
    for (const [index, user] of crew.entries()) {
      if ((day + index) % 7 === 0) continue;

      await prisma.attendance.create({
        data: {
          userId: user.id,
          siteId: sites[index % sites.length].id,
          workDate: dateFromToday(day),
          checkInAt: new Date(dateFromToday(day).setHours(8, 15 + index, 0, 0)),
          checkOutAt: day === 0 && index > 5 ? null : new Date(dateFromToday(day).setHours(17, 45 - index, 0, 0)),
          workUnit: (day + index) % 9 === 0 ? 0.5 : 1,
          status: (day + index) % 9 === 0 ? "half_day" : "present",
          note: (day + index) % 9 === 0 ? "오후 반차" : null,
        },
      });
    }
  }

  for (const [index, schedule] of schedules.slice(0, 18).entries()) {
    const user = crew[index % crew.length];
    const log = await prisma.workLog.create({
      data: {
        siteId: schedule.siteId,
        userId: user.id,
        scheduleId: schedule.id,
        workDate: schedule.workDate,
        content: index % 2 === 0 ? "철거 구간 정리 및 폐기물 반출 완료" : "도배 밑작업과 몰딩 보수 진행",
        issues: index % 5 === 0 ? "추가 자재 확인 필요" : null,
        materialRequest: index % 4 === 0 ? "퍼티 2박스, 커버링 테이프" : null,
        status: index % 3 === 0 ? "checked" : "submitted",
        photos: {
          create: [
            { imageUrl: `https://picsum.photos/seed/work-${index}-a/800/600` },
            { imageUrl: `https://picsum.photos/seed/work-${index}-b/800/600` },
          ],
        },
      },
    });

    if (index < 4) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "notice",
          title: "작업일지 확인",
          message: `${log.content.slice(0, 16)}... 관리자 확인 대기 중입니다.`,
        },
      });
    }
  }

  for (const user of crew) {
    const attendances = await prisma.attendance.findMany({ where: { userId: user.id } });
    const totalWorkUnit = attendances.reduce((sum, item) => sum + item.workUnit.toNumber(), 0);
    const dailyWage = user.dailyWage.toNumber();
    await prisma.payroll.create({
      data: {
        userId: user.id,
        yearMonth: yearMonth(),
        totalWorkUnit,
        dailyWage,
        totalAmount: totalWorkUnit * dailyWage,
        paidAmount: user.id === leader.id ? totalWorkUnit * dailyWage : 0,
        paidStatus: user.id === leader.id ? "paid" : "pending",
        paidAt: user.id === leader.id ? new Date() : null,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed data created. Login: admin@field.local / password1234");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
