import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

type PaintLedgerJsonRow = {
  sourceRow: number;
  workDate: string | null;
  siteAddress: string | null;
  materialSpec: string | null;
  amount: number | null;
  paymentStatus: string | null;
  memo: string | null;
  suppliedMaterials: string | null;
  laborCost: number | null;
  fuelCost: number | null;
  materialCost: number | null;
  ownerCategory: string | null;
  isDayOff: boolean;
};

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb((process.env.DATABASE_URL ?? "").replace(/^mysql:\/\//, "mariadb://")),
});

function toDate(value: string | null) {
  return value ? new Date(value) : null;
}

function emptyToNull(value: unknown) {
  return value === "" || value === undefined ? null : value;
}

function moneyOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function main() {
  const filePath = path.join(process.cwd(), "prisma", "paint-ledger-2025.json");
  const rows = JSON.parse(await fs.readFile(filePath, "utf8")) as PaintLedgerJsonRow[];

  for (const row of rows) {
    await prisma.paintLedgerEntry.upsert({
      where: { sourceRow: row.sourceRow },
      update: {
        workDate: toDate(row.workDate),
        siteAddress: emptyToNull(row.siteAddress) as string | null,
        materialSpec: emptyToNull(row.materialSpec) as string | null,
        amount: moneyOrNull(row.amount),
        paymentStatus: emptyToNull(row.paymentStatus) as string | null,
        memo: emptyToNull(row.memo) as string | null,
        suppliedMaterials: emptyToNull(row.suppliedMaterials) as string | null,
        laborCost: moneyOrNull(row.laborCost),
        fuelCost: moneyOrNull(row.fuelCost),
        materialCost: moneyOrNull(row.materialCost),
        ownerCategory: row.ownerCategory,
        isDayOff: row.isDayOff,
      },
      create: {
        sourceRow: row.sourceRow,
        workDate: toDate(row.workDate),
        siteAddress: emptyToNull(row.siteAddress) as string | null,
        materialSpec: emptyToNull(row.materialSpec) as string | null,
        amount: moneyOrNull(row.amount),
        paymentStatus: emptyToNull(row.paymentStatus) as string | null,
        memo: emptyToNull(row.memo) as string | null,
        suppliedMaterials: emptyToNull(row.suppliedMaterials) as string | null,
        laborCost: moneyOrNull(row.laborCost),
        fuelCost: moneyOrNull(row.fuelCost),
        materialCost: moneyOrNull(row.materialCost),
        ownerCategory: row.ownerCategory,
        isDayOff: row.isDayOff,
      },
    });
  }

  console.log(`Imported ${rows.length} paint ledger rows.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
