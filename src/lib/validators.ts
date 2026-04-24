import { z } from "zod";

export const siteSchema = z.object({
  name: z.string().min(1),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  address: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "paused"]).optional(),
  memo: z.string().optional(),
  createdById: z.coerce.bigint().optional(),
});

export const siteUpdateSchema = siteSchema.partial().omit({ createdById: true });

export const userSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.union([z.literal(""), z.string().email()]).optional().transform((value) => value || undefined),
  role: z.enum(["leader", "worker"]).default("worker"),
  dailyWage: z.coerce.number().min(0).optional(),
});

export const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  email: z.union([z.literal(""), z.string().email()]).optional().transform((v) => v || undefined),
  password: z.string().min(6),
  profilePhoto: z.string().min(1),
  faceDescriptor: z.array(z.number()).optional(),
});

export const bootstrapAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

export const faceLoginSchema = z.object({
  descriptor: z.array(z.number()).length(128),
});

export const approveSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

export const scheduleSchema = z.object({
  siteId: z.coerce.bigint(),
  title: z.string().min(1),
  description: z.string().optional(),
  workLocation: z.string().optional(),
  workType: z.string().optional(),
  workDate: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  estimatedWorkUnit: z.coerce.number().min(0).max(9.99).optional(),
  totalAmount: z.coerce.number().optional(),
  status: z.enum(["planned", "in_progress", "completed", "paused"]).optional(),
  workerIds: z.array(z.coerce.bigint()).optional(),
  workerWages: z.record(z.string(), z.coerce.number()).optional(),
  createdById: z.coerce.bigint().optional(),
  createdByRole: z.enum(["admin", "leader", "worker"]).optional(),
});

export const attendanceSchema = z.object({
  userId: z.coerce.bigint(),
  siteId: z.coerce.bigint().optional(),
  workDate: z.string().optional(),
});

export const workLogSchema = z.object({
  siteId: z.coerce.bigint(),
  userId: z.coerce.bigint(),
  scheduleId: z.coerce.bigint().optional(),
  workDate: z.string(),
  content: z.string().min(1),
  issues: z.string().optional(),
  materialRequest: z.string().optional(),
  photos: z.array(z.string().url()).optional(),
});

const optionalMoney = z.union([z.literal(""), z.coerce.number()]).optional().transform((value) => {
  if (value === "" || value === undefined) return undefined;
  return value;
});

export const paintLedgerSchema = z.object({
  userId: z.coerce.bigint().optional(),
  workDate: z.string().optional(),
  siteAddress: z.string().optional(),
  materialSpec: z.string().optional(),
  amount: optionalMoney,
  paymentStatus: z.string().optional(),
  memo: z.string().optional(),
  suppliedMaterials: z.string().optional(),
  laborCost: optionalMoney,
  fuelCost: optionalMoney,
  materialCost: optionalMoney,
  ownerCategory: z.enum(["mine", "boss", "uncategorized"]).optional(),
  isDayOff: z.boolean().optional(),
});
