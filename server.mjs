import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import webpush from "web-push";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, desc } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── DB 연결 ──────────────────────────────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// ── 스키마 인라인 (ESM에서 import 편의상) ──────────────────────────────────
import { pgTable, text, boolean, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";

const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hash: text("hash").notNull(),
  role: text("role").notNull().default("user"),
  gender: text("gender"),
  phone: text("phone"),
  memo: text("memo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const dogs = pgTable("dogs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  breed: text("breed").notNull(),
  age: real("age").notNull().default(0),
  gender: text("gender").notNull(),
  weight: real("weight").default(0),
  neutered: boolean("neutered").default(false),
  photo: text("photo"),
  birthday: text("birthday"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const dailyLogs = pgTable("daily_logs", {
  id: text("id").primaryKey(),
  dogId: text("dog_id").notNull(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  meal: integer("meal").notNull().default(0),
  walk: boolean("walk").default(false),
  poop: boolean("poop").default(false),
  pee: boolean("pee").default(false),
  energy: integer("energy").notNull().default(1),
  memo: text("memo").default(""),
});

const vetVisits = pgTable("vet_visits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  dogName: text("dog_name").notNull(),
  hospitalName: text("hospital_name").notNull(),
  visitDate: text("visit_date").notNull(),
  items: jsonb("items").default([]),
  totalPrice: integer("total_price").default(0),
  diagnosis: text("diagnosis").default(""),
  prescriptions: jsonb("prescriptions").default([]),
  nextVisitDate: text("next_visit_date").default(""),
  notes: text("notes").default(""),
  receiptPhoto: text("receipt_photo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const vaccines = pgTable("vaccines", {
  id: text("id").primaryKey(),
  dogId: text("dog_id").notNull(),
  userId: text("user_id").notNull(),
  vaccineName: text("vaccine_name").notNull(),
  date: text("date").notNull(),
  hospitalName: text("hospital_name").default(""),
  nextDate: text("next_date").default(""),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const preventionMeds = pgTable("prevention_meds", {
  id: text("id").primaryKey(),
  dogId: text("dog_id").notNull(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  yearMonth: text("year_month").notNull(),
  done: boolean("done").default(false),
  doneAt: text("done_at"),
  productName: text("product_name"),
});

const schedules = pgTable("schedules", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  time: text("time").notNull(),
  repeat: text("repeat").notNull().default("none"),
  dogId: text("dog_id"),
  dogName: text("dog_name"),
  medicineName: text("medicine_name"),
  vaccineDate: text("vaccine_date"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const weightRecords = pgTable("weight_records", {
  id: text("id").primaryKey(),
  dogId: text("dog_id").notNull(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  weight: real("weight").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  tabOrder: jsonb("tab_order").default([]),
  theme: text("theme").default("system"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  clientId: text("client_id").notNull(),
  endpoint: text("endpoint").notNull(),
  keys: jsonb("keys").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const aiLogs = pgTable("ai_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  dogName: text("dog_name").notNull(),
  input: text("input").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── JWT 시크릿 ──────────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.warn("[경고] JWT_SECRET 환경변수가 없습니다. DATABASE_URL 기반 시크릿을 사용합니다. 보안을 위해 Railway에서 JWT_SECRET을 설정하세요.");
}
const JWT_SECRET = process.env.JWT_SECRET ||
  crypto.createHash("sha256").update(process.env.DATABASE_URL || "meongcare-fallback-secret").digest("hex");

// ── 인증 미들웨어 ────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token;
  if (!token) return res.status(401).json({ error: "로그인이 필요해요." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "세션이 만료됐어요. 다시 로그인해주세요." });
  }
}

async function adminOnly(req, res, next) {
  const rows = await db.select().from(users).where(eq(users.id, req.user.id));
  if (!rows[0] || rows[0].role !== "admin") return res.status(403).json({ error: "관리자만 접근할 수 있어요." });
  next();
}

// ── 관리자 계정 초기화 ───────────────────────────────────────────────────────
const ADMIN_NAME = "관리자";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
(async () => {
  try {
    if (!ADMIN_PASSWORD) {
      console.warn("[경고] ADMIN_PASSWORD 환경변수가 없습니다. 관리자 계정이 생성되지 않습니다.");
      return;
    }
    if (ADMIN_PASSWORD.length < 8) {
      console.warn("[경고] ADMIN_PASSWORD가 8자 미만입니다. 더 강력한 비밀번호를 설정하세요.");
    }
    const existing = await db.select().from(users).where(eq(users.name, ADMIN_NAME));
    if (existing.length === 0) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.insert(users).values({ id: crypto.randomUUID(), name: ADMIN_NAME, hash, role: "admin" });
      console.log(`관리자 계정 생성: ${ADMIN_NAME}`);
    } else {
      const match = await bcrypt.compare(ADMIN_PASSWORD, existing[0].hash);
      if (!match) {
        const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        await db.update(users).set({ hash }).where(eq(users.id, existing[0].id));
        console.log("관리자 비밀번호 업데이트 완료");
      }
    }
  } catch (e) {
    console.error("관리자 초기화 실패:", e.message);
  }
})();

// ── Rate Limiting (인증 엔드포인트) ──────────────────────────────────────────
const authAttempts = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 10;

function authRateLimit(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const record = authAttempts.get(ip);
  if (record) {
    record.attempts = record.attempts.filter((t) => now - t < AUTH_WINDOW_MS);
    if (record.attempts.length >= AUTH_MAX_ATTEMPTS) {
      return res.status(429).json({ error: "너무 많은 요청이에요. 15분 후에 다시 시도해주세요." });
    }
    record.attempts.push(now);
  } else {
    authAttempts.set(ip, { attempts: [now] });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of authAttempts) {
    record.attempts = record.attempts.filter((t) => now - t < AUTH_WINDOW_MS);
    if (record.attempts.length === 0) authAttempts.delete(ip);
  }
}, 60 * 1000);

// ── 회원가입 / 로그인 API ────────────────────────────────────────────────────
app.post("/api/auth/register", authRateLimit, async (req, res) => {
  const { name, password } = req.body;
  if (!name?.trim() || !password) return res.status(400).json({ error: "이름과 비밀번호를 입력해주세요." });
  if (password.length < 4) return res.status(400).json({ error: "비밀번호는 4자 이상이어야 해요." });

  const existing = await db.select().from(users).where(eq(users.name, name.trim()));
  if (existing.length > 0) return res.status(409).json({ error: "이미 사용 중인 이름이에요." });

  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);
  await db.insert(users).values({ id, name: name.trim(), hash, role: "user" });

  const token = jwt.sign({ id, name: name.trim(), role: "user" }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id, name: name.trim() } });
});

app.post("/api/auth/login", authRateLimit, async (req, res) => {
  const { name, password } = req.body;
  if (!name?.trim() || !password) return res.status(400).json({ error: "이름과 비밀번호를 입력해주세요." });

  const rows = await db.select().from(users).where(eq(users.name, name.trim()));
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "존재하지 않는 사용자예요." });

  const valid = await bcrypt.compare(password, user.hash);
  if (!valid) return res.status(401).json({ error: "비밀번호가 틀렸어요." });

  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name } });
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const rows = await db.select().from(users).where(eq(users.id, req.user.id));
  if (!rows[0]) return res.status(404).json({ error: "사용자를 찾을 수 없어요." });
  const { hash, ...safe } = rows[0];
  res.json({ user: safe });
});

app.patch("/api/auth/profile", authMiddleware, async (req, res) => {
  const { gender, phone, memo } = req.body;
  const update = {};
  if (gender !== undefined) update.gender = gender;
  if (phone !== undefined) update.phone = phone;
  if (memo !== undefined) update.memo = memo;
  await db.update(users).set(update).where(eq(users.id, req.user.id));
  const rows = await db.select().from(users).where(eq(users.id, req.user.id));
  const { hash, ...safe } = rows[0];
  res.json({ user: safe });
});

// ── 관리자 API ───────────────────────────────────────────────────────────────
app.get("/api/admin/push-subs", authMiddleware, adminOnly, async (req, res) => {
  const subs = await db.select().from(pushSubscriptions);
  const allUsers = await db.select().from(users);
  const result = subs.map(s => {
    const u = allUsers.find(u => u.id === s.userId);
    return { clientId: s.clientId, userId: s.userId, userName: u?.name ?? "(없음)", endpoint: s.endpoint?.slice(0, 60) + "..." };
  });
  const memSubs = [...subscriptions.entries()].map(([cid, sub]) => ({
    clientId: cid, userId: sub.userId, hasEndpoint: !!sub.endpoint,
  }));
  res.json({ db: result, memory: memSubs });
});


app.get("/api/admin/stats", authMiddleware, adminOnly, async (req, res) => {
  const [allUsers, allDogs, allAiLogs, allVetVisits, allVaccines] = await Promise.all([
    db.select().from(users),
    db.select().from(dogs),
    db.select().from(aiLogs),
    db.select().from(vetVisits),
    db.select().from(vaccines),
  ]);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const newUsersThisWeek = allUsers.filter(u => new Date(u.createdAt) >= weekAgo).length;

  const aiByType = allAiLogs.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {});

  // 유저별 활동량
  const userActivity = allUsers
    .filter(u => u.role !== "admin")
    .map(u => ({
      id: u.id,
      name: u.name,
      createdAt: u.createdAt,
      dogs: allDogs.filter(d => d.userId === u.id).length,
      aiLogs: allAiLogs.filter(l => l.userId === u.id).length,
      vetVisits: allVetVisits.filter(v => v.userId === u.id).length,
    }))
    .sort((a, b) => b.aiLogs - a.aiLogs);

  res.json({
    totalUsers: allUsers.filter(u => u.role !== "admin").length,
    newUsersThisWeek,
    totalDogs: allDogs.length,
    totalAiLogs: allAiLogs.length,
    aiByType,
    totalVetVisits: allVetVisits.length,
    totalVaccines: allVaccines.length,
    userActivity,
  });
});
app.get("/api/admin/users", authMiddleware, adminOnly, async (req, res) => {
  const rows = await db.select().from(users);
  res.json({ users: rows.map(({ hash, ...u }) => u) });
});

app.patch("/api/admin/reset-password", authMiddleware, adminOnly, async (req, res) => {
  const { targetName, newPassword } = req.body;
  if (!targetName || !newPassword) return res.status(400).json({ error: "이름과 새 비밀번호를 입력해주세요." });
  if (newPassword.length < 4) return res.status(400).json({ error: "비밀번호는 4자 이상이어야 해요." });
  const hash = await bcrypt.hash(newPassword, 10);
  const rows = await db.select().from(users).where(eq(users.name, targetName));
  if (!rows[0]) return res.status(404).json({ error: "해당 사용자를 찾을 수 없어요." });
  await db.update(users).set({ hash }).where(eq(users.name, targetName));
  res.json({ ok: true, message: `${targetName}의 비밀번호가 변경됐어요.` });
});

app.delete("/api/admin/users/:id", authMiddleware, adminOnly, async (req, res) => {
  const rows = await db.select().from(users).where(eq(users.id, req.params.id));
  if (!rows[0]) return res.status(404).json({ error: "사용자를 찾을 수 없어요." });
  if (rows[0].role === "admin") return res.status(403).json({ error: "관리자 계정은 삭제할 수 없어요." });
  await db.delete(users).where(eq(users.id, req.params.id));
  res.json({ ok: true });
});

// ── 강아지 CRUD ──────────────────────────────────────────────────────────────
app.get("/api/dogs", authMiddleware, async (req, res) => {
  const rows = await db.select().from(dogs).where(eq(dogs.userId, req.user.id));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString() })));
});

app.post("/api/dogs", authMiddleware, async (req, res) => {
  const { id, name, breed, age, gender, weight, neutered, photo, birthday } = req.body;
  const dogId = id || crypto.randomUUID();
  await db.insert(dogs).values({ id: dogId, userId: req.user.id, name, breed, age: age ?? 0, gender, weight: weight ?? 0, neutered: neutered ?? false, photo: photo ?? null, birthday: birthday ?? null });
  const rows = await db.select().from(dogs).where(eq(dogs.id, dogId));
  res.json({ ...rows[0], createdAt: rows[0].createdAt?.toISOString() });
});

app.patch("/api/dogs/:id", authMiddleware, async (req, res) => {
  const { name, breed, age, gender, weight, neutered, photo, birthday } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (breed !== undefined) update.breed = breed;
  if (age !== undefined) update.age = age;
  if (gender !== undefined) update.gender = gender;
  if (weight !== undefined) update.weight = weight;
  if (neutered !== undefined) update.neutered = neutered;
  if (photo !== undefined) update.photo = photo;
  if (birthday !== undefined) update.birthday = birthday;
  await db.update(dogs).set(update).where(and(eq(dogs.id, req.params.id), eq(dogs.userId, req.user.id)));
  const rows = await db.select().from(dogs).where(eq(dogs.id, req.params.id));
  res.json({ ...rows[0], createdAt: rows[0].createdAt?.toISOString() });
});

app.delete("/api/dogs/:id", authMiddleware, async (req, res) => {
  await db.delete(dogs).where(and(eq(dogs.id, req.params.id), eq(dogs.userId, req.user.id)));
  res.json({ ok: true });
});

// ── 일일 로그 CRUD ───────────────────────────────────────────────────────────
app.get("/api/daily-logs/:dogId", authMiddleware, async (req, res) => {
  const rows = await db.select().from(dailyLogs)
    .where(and(eq(dailyLogs.dogId, req.params.dogId), eq(dailyLogs.userId, req.user.id)));
  res.json(rows);
});

app.post("/api/daily-logs", authMiddleware, async (req, res) => {
  const { id, dogId, date, meal, walk, poop, pee, energy, memo } = req.body;
  const existing = await db.select().from(dailyLogs)
    .where(and(eq(dailyLogs.dogId, dogId), eq(dailyLogs.userId, req.user.id), eq(dailyLogs.date, date)));
  if (existing[0]) {
    await db.update(dailyLogs).set({ meal, walk, poop, pee, energy, memo })
      .where(eq(dailyLogs.id, existing[0].id));
    const updated = await db.select().from(dailyLogs).where(eq(dailyLogs.id, existing[0].id));
    return res.json(updated[0]);
  }
  const logId = id || crypto.randomUUID();
  await db.insert(dailyLogs).values({ id: logId, dogId, userId: req.user.id, date, meal: meal ?? 0, walk: walk ?? false, poop: poop ?? false, pee: pee ?? false, energy: energy ?? 1, memo: memo ?? "" });
  const rows = await db.select().from(dailyLogs).where(eq(dailyLogs.id, logId));
  res.json(rows[0]);
});

// ── 병원 방문 CRUD ───────────────────────────────────────────────────────────
app.get("/api/vet-visits", authMiddleware, async (req, res) => {
  const rows = await db.select().from(vetVisits)
    .where(eq(vetVisits.userId, req.user.id))
    .orderBy(desc(vetVisits.createdAt));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString() })));
});

app.post("/api/vet-visits", authMiddleware, async (req, res) => {
  const { id, dogName, hospitalName, visitDate, items, totalPrice, diagnosis, prescriptions, nextVisitDate, notes, receiptPhoto } = req.body;
  const visitId = id || crypto.randomUUID();
  await db.insert(vetVisits).values({ id: visitId, userId: req.user.id, dogName, hospitalName, visitDate, items: items ?? [], totalPrice: totalPrice ?? 0, diagnosis: diagnosis ?? "", prescriptions: prescriptions ?? [], nextVisitDate: nextVisitDate ?? "", notes: notes ?? "", receiptPhoto: receiptPhoto ?? null });
  const rows = await db.select().from(vetVisits).where(eq(vetVisits.id, visitId));
  res.json({ ...rows[0], createdAt: rows[0].createdAt?.toISOString() });
});

app.delete("/api/vet-visits/:id", authMiddleware, async (req, res) => {
  await db.delete(vetVisits).where(and(eq(vetVisits.id, req.params.id), eq(vetVisits.userId, req.user.id)));
  res.json({ ok: true });
});

// ── 예방접종 CRUD ─────────────────────────────────────────────────────────────
// ── 체중 기록 ────────────────────────────────────────────────────────────────
app.get("/api/weight/:dogId", authMiddleware, async (req, res) => {
  const rows = await db.select().from(weightRecords)
    .where(and(eq(weightRecords.dogId, req.params.dogId), eq(weightRecords.userId, req.user.id)))
    .orderBy(weightRecords.date);
  res.json(rows);
});

app.post("/api/weight", authMiddleware, async (req, res) => {
  const { dogId, weight, date } = req.body;
  if (!dogId || !weight) return res.status(400).json({ error: "필수값 누락" });
  const today = date ?? new Date().toISOString().slice(0, 10);
  const existing = await db.select().from(weightRecords)
    .where(and(eq(weightRecords.dogId, dogId), eq(weightRecords.userId, req.user.id), eq(weightRecords.date, today)));
  if (existing[0]) {
    await db.update(weightRecords).set({ weight }).where(eq(weightRecords.id, existing[0].id));
    const updated = await db.select().from(weightRecords).where(eq(weightRecords.id, existing[0].id));
    return res.json(updated[0]);
  }
  const id = crypto.randomUUID();
  await db.insert(weightRecords).values({ id, dogId, userId: req.user.id, date: today, weight });
  const row = await db.select().from(weightRecords).where(eq(weightRecords.id, id));
  res.json(row[0]);
});

app.delete("/api/weight/:id", authMiddleware, async (req, res) => {
  await db.delete(weightRecords).where(and(eq(weightRecords.id, req.params.id), eq(weightRecords.userId, req.user.id)));
  res.json({ ok: true });
});

app.get("/api/vaccines/:dogId", authMiddleware, async (req, res) => {
  const rows = await db.select().from(vaccines)
    .where(and(eq(vaccines.dogId, req.params.dogId), eq(vaccines.userId, req.user.id)))
    .orderBy(desc(vaccines.date));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString() })));
});

app.post("/api/vaccines", authMiddleware, async (req, res) => {
  const { id, dogId, vaccineName, date, hospitalName, nextDate, notes } = req.body;
  const vaccineId = id || crypto.randomUUID();
  await db.insert(vaccines).values({ id: vaccineId, dogId, userId: req.user.id, vaccineName, date, hospitalName: hospitalName ?? "", nextDate: nextDate ?? "", notes: notes ?? "" });
  const rows = await db.select().from(vaccines).where(eq(vaccines.id, vaccineId));
  res.json({ ...rows[0], createdAt: rows[0].createdAt?.toISOString() });
});

app.delete("/api/vaccines/:id", authMiddleware, async (req, res) => {
  await db.delete(vaccines).where(and(eq(vaccines.id, req.params.id), eq(vaccines.userId, req.user.id)));
  res.json({ ok: true });
});

// 전체 강아지 다가오는 접종 조회
app.get("/api/vaccines/upcoming/all", authMiddleware, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.select().from(vaccines).where(eq(vaccines.userId, req.user.id));
  const upcoming = rows
    .filter(v => v.nextDate && v.nextDate >= today)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
    .slice(0, 3)
    .map(r => ({ ...r, createdAt: r.createdAt?.toISOString() }));
  res.json(upcoming);
});

// ── 예방약 CRUD ───────────────────────────────────────────────────────────────
app.get("/api/prevention-meds/:dogId", authMiddleware, async (req, res) => {
  const rows = await db.select().from(preventionMeds)
    .where(and(eq(preventionMeds.dogId, req.params.dogId), eq(preventionMeds.userId, req.user.id)));
  res.json(rows);
});

app.post("/api/prevention-meds/toggle", authMiddleware, async (req, res) => {
  const { dogId, type, yearMonth, productName } = req.body;
  const existing = await db.select().from(preventionMeds)
    .where(and(eq(preventionMeds.dogId, dogId), eq(preventionMeds.userId, req.user.id), eq(preventionMeds.type, type), eq(preventionMeds.yearMonth, yearMonth)));
  if (existing[0]) {
    const newDone = !existing[0].done;
    await db.update(preventionMeds).set({ done: newDone, doneAt: newDone ? new Date().toISOString() : null })
      .where(eq(preventionMeds.id, existing[0].id));
    const updated = await db.select().from(preventionMeds).where(eq(preventionMeds.id, existing[0].id));
    return res.json(updated[0]);
  }
  const newId = crypto.randomUUID();
  await db.insert(preventionMeds).values({ id: newId, dogId, userId: req.user.id, type, yearMonth, done: true, doneAt: new Date().toISOString(), productName: productName ?? null });
  const rows = await db.select().from(preventionMeds).where(eq(preventionMeds.id, newId));
  res.json(rows[0]);
});

// ── 사용자 설정 API ───────────────────────────────────────────────────────────
app.get("/api/settings", authMiddleware, async (req, res) => {
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, req.user.id));
  res.json(rows[0] ?? { tabOrder: [], theme: "system" });
});

app.post("/api/settings", authMiddleware, async (req, res) => {
  const { tabOrder, theme } = req.body;
  const update = {};
  if (tabOrder !== undefined) update.tabOrder = tabOrder;
  if (theme !== undefined) update.theme = theme;
  update.updatedAt = new Date();
  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, req.user.id));
  if (existing.length > 0) {
    await db.update(userSettings).set(update).where(eq(userSettings.userId, req.user.id));
  } else {
    await db.insert(userSettings).values({ userId: req.user.id, ...update });
  }
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, req.user.id));
  res.json(rows[0]);
});

// ── AI 로그 CRUD ──────────────────────────────────────────────────────────────
app.get("/api/ai-logs", authMiddleware, async (req, res) => {
  const rows = await db.select().from(aiLogs)
    .where(eq(aiLogs.userId, req.user.id))
    .orderBy(desc(aiLogs.createdAt));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString() })));
});

app.post("/api/ai-logs", authMiddleware, async (req, res) => {
  const { type, dogName, input, result } = req.body;
  const id = crypto.randomUUID();
  await db.insert(aiLogs).values({ id, userId: req.user.id, type, dogName, input, result });
  const rows = await db.select().from(aiLogs).where(eq(aiLogs.id, id));
  res.json({ ...rows[0], createdAt: rows[0].createdAt?.toISOString() });
});

app.delete("/api/ai-logs/:id", authMiddleware, async (req, res) => {
  await db.delete(aiLogs).where(and(eq(aiLogs.id, req.params.id), eq(aiLogs.userId, req.user.id)));
  res.json({ ok: true });
});

app.delete("/api/ai-logs", authMiddleware, async (req, res) => {
  await db.delete(aiLogs).where(eq(aiLogs.userId, req.user.id));
  res.json({ ok: true });
});

// ── 스케줄 CRUD ───────────────────────────────────────────────────────────────
app.get("/api/schedules", authMiddleware, async (req, res) => {
  const rows = await db.select().from(schedules).where(eq(schedules.userId, req.user.id));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString() })));
});

app.post("/api/schedules", authMiddleware, async (req, res) => {
  const { id, type, title, time, repeat, dogId, dogName, medicineName, vaccineDate, enabled } = req.body;
  const scheduleId = id || crypto.randomUUID();
  await db.insert(schedules).values({ id: scheduleId, userId: req.user.id, type, title, time, repeat: repeat ?? "none", dogId: dogId ?? null, dogName: dogName ?? null, medicineName: medicineName ?? null, vaccineDate: vaccineDate ?? null, enabled: enabled ?? true });
  const rows = await db.select().from(schedules).where(eq(schedules.id, scheduleId));
  const s = { ...rows[0], createdAt: rows[0].createdAt?.toISOString() };
  serverSchedules.set(scheduleId, { ...s, _userId: req.user.id });
  res.json(s);
});

app.patch("/api/schedules/:id", authMiddleware, async (req, res) => {
  const { enabled, title, time, repeat, dogId, dogName, medicineName, vaccineDate } = req.body;
  const update = {};
  if (enabled !== undefined) update.enabled = enabled;
  if (title !== undefined) update.title = title;
  if (time !== undefined) update.time = time;
  if (repeat !== undefined) update.repeat = repeat;
  if (dogId !== undefined) update.dogId = dogId;
  if (dogName !== undefined) update.dogName = dogName;
  if (medicineName !== undefined) update.medicineName = medicineName;
  if (vaccineDate !== undefined) update.vaccineDate = vaccineDate;
  await db.update(schedules).set(update).where(and(eq(schedules.id, req.params.id), eq(schedules.userId, req.user.id)));
  const rows = await db.select().from(schedules).where(eq(schedules.id, req.params.id));
  const s = { ...rows[0], createdAt: rows[0].createdAt?.toISOString() };
  serverSchedules.set(req.params.id, { ...s, _userId: req.user.id });
  res.json(s);
});

app.delete("/api/schedules/:id", authMiddleware, async (req, res) => {
  await db.delete(schedules).where(and(eq(schedules.id, req.params.id), eq(schedules.userId, req.user.id)));
  serverSchedules.delete(req.params.id);
  res.json({ ok: true });
});

// ── 스케줄 동기화 (레거시 호환) ───────────────────────────────────────────────
app.post("/api/schedules/sync", authMiddleware, (req, res) => {
  const { schedules: sched } = req.body;
  const userId = req.user.id;
  if (!Array.isArray(sched)) return res.status(400).json({ error: "schedules must be array" });
  for (const [id, s] of serverSchedules) {
    if (s._userId === userId) serverSchedules.delete(id);
  }
  sched.forEach((s) => serverSchedules.set(s.id, { ...s, _userId: userId }));
  res.json({ ok: true });
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── VAPID 설정 ──────────────────────────────────────────────────────────────
const VAPID_FILE = path.join(__dirname, "vapid.json");
let vapidKeys;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapidKeys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
} else if (existsSync(VAPID_FILE)) {
  vapidKeys = JSON.parse(readFileSync(VAPID_FILE, "utf8"));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
  console.log("VAPID 키 생성 완료");
}
webpush.setVapidDetails("mailto:admin@meongcare.app", vapidKeys.publicKey, vapidKeys.privateKey);

// ── 인메모리 (푸시 알림용) ────────────────────────────────────────────────────
const subscriptions = new Map();
const serverSchedules = new Map();
const firedThisMinute = new Map();
const firedOnce = new Set();

// 서버 시작 시 DB에서 구독 + 스케줄 복원
(async () => {
  try {
    const subs = await db.select().from(pushSubscriptions);
    for (const s of subs) {
      subscriptions.set(s.clientId, { endpoint: s.endpoint, keys: s.keys, userId: s.userId });
    }
    console.log(`푸시 구독 복원: ${subs.length}개`);

    const scheds = await db.select().from(schedules);
    for (const s of scheds) {
      serverSchedules.set(s.id, { ...s, _userId: s.userId, createdAt: s.createdAt?.toISOString() });
    }
    console.log(`스케줄 복원: ${scheds.length}개`);
  } catch (e) {
    console.error("초기화 복원 실패:", e.message);
  }
})();

app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post("/api/push-subscribe", authMiddleware, async (req, res) => {
  const { subscription, clientId } = req.body;
  const userId = req.user.id;
  if (!subscription || !clientId) return res.status(400).json({ error: "missing fields" });
  subscriptions.set(clientId, { ...subscription, userId });
  try {
    const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.clientId, clientId));
    if (existing.length > 0) {
      await db.update(pushSubscriptions).set({ endpoint: subscription.endpoint, keys: subscription.keys, userId }).where(eq(pushSubscriptions.clientId, clientId));
    } else {
      await db.insert(pushSubscriptions).values({ id: crypto.randomUUID(), clientId, endpoint: subscription.endpoint, keys: subscription.keys, userId });
    }
  } catch (e) { console.error("구독 저장 실패:", e.message); }
  res.json({ ok: true });
});

app.delete("/api/push-unsubscribe", authMiddleware, async (req, res) => {
  const { clientId } = req.body;
  subscriptions.delete(clientId);
  try { await db.delete(pushSubscriptions).where(eq(pushSubscriptions.clientId, clientId)); } catch {}
  res.json({ ok: true });
});

app.post("/api/push-test", authMiddleware, adminOnly, async (req, res) => {
  const { userId } = req.body;
  const targets = [...subscriptions.entries()].filter(([, sub]) => {
    if (userId && sub.userId) return sub.userId === userId;
    return true;
  });
  if (targets.length === 0) return res.status(400).json({ error: "등록된 구독자가 없어요." });
  const payload = JSON.stringify({ title: "멍케어 테스트 알림", body: "푸시 알림이 정상 작동하고 있어요!" });
  const results = await Promise.allSettled(
    targets.map(([clientId, sub]) => {
      const pushSub = { endpoint: sub.endpoint, keys: sub.keys };
      return webpush.sendNotification(pushSub, payload).catch((err) => {
        if (err.statusCode === 410 || err.statusCode === 404) subscriptions.delete(clientId);
        throw err;
      });
    })
  );
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  res.json({ ok: true, sent: succeeded, total: results.length });
});

function sendPushToUser(userId, payload) {
  const text = JSON.stringify(payload);
  for (const [clientId, sub] of subscriptions) {
    if (!sub.userId || sub.userId !== userId) continue;
    const pushSub = { endpoint: sub.endpoint, keys: sub.keys };
    webpush.sendNotification(pushSub, text).catch((err) => {
      if (err.statusCode === 410 || err.statusCode === 404) subscriptions.delete(clientId);
    });
  }
}

function checkSchedules() {
  if (subscriptions.size === 0) return;
  const now = new Date();
  // KST (UTC+9) 기준으로 시간 계산
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hhmm = `${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")}`;
  const todayStr = kst.toISOString().slice(0, 10);

  // 어제 이전 항목 정리 (메모리 누수 방지)
  for (const [key, val] of firedThisMinute) {
    if (typeof val === "string" && val.length === 10 && val < todayStr) firedThisMinute.delete(key);
  }

  for (const [id, s] of serverSchedules) {
    if (!s.enabled) continue;
    if (s.type === "vaccine") {
      if (!s.vaccineDate || hhmm !== "09:00") continue;
      const fireKey = `${id}_${todayStr}`;
      if (firedThisMinute.get(id) === fireKey) continue;
      const target = new Date(s.vaccineDate + "T00:00:00+09:00");
      const todayKst = new Date(todayStr + "T00:00:00+09:00");
      const diff = Math.round((target - todayKst) / 86400000);
      if (diff === 7 || diff === 1 || diff === 0) {
        firedThisMinute.set(id, fireKey);
        const label = diff === 0 ? "오늘이에요!" : `D-${diff}이에요!`;
        sendPushToUser(s._userId, { title: "예방접종 알림", body: s.dogName ? `${s.dogName}의 ${s.title} ${label}` : `${s.title} ${label}` });
      }
      continue;
    }
    if (s.time !== hhmm) continue;
    if (firedThisMinute.get(id) === hhmm) continue;
    const created = new Date(s.createdAt);
    const createdKst = new Date(created.getTime() + 9 * 60 * 60 * 1000);
    let shouldFire = false;
    if (s.repeat === "daily") shouldFire = true;
    else if (s.repeat === "weekly") shouldFire = kst.getUTCDay() === createdKst.getUTCDay();
    else if (s.repeat === "monthly") shouldFire = kst.getUTCDate() === createdKst.getUTCDate();
    else if (s.repeat === "none") { if (!firedOnce.has(id)) { shouldFire = true; firedOnce.add(id); } }
    if (!shouldFire) continue;
    firedThisMinute.set(id, hhmm);
    sendPushToUser(s._userId, { title: s.title, body: s.dogName ? `${s.dogName}의 ${s.title} 시간이에요!` : `${s.title} 시간이에요!` });
  }
}

const nowMs = new Date();
setTimeout(() => { checkSchedules(); setInterval(checkSchedules, 60_000); }, (60 - nowMs.getSeconds()) * 1000 - nowMs.getMilliseconds());

// ── 데이터 백업 API ──────────────────────────────────────────────────────────
app.get("/api/backup", authMiddleware, async (req, res) => {
  const [userDogs, userLogs, userSchedules, userVetVisits, userAiLogs, userWeights] = await Promise.all([
    db.select().from(dogs).where(eq(dogs.userId, req.user.id)),
    db.select().from(dailyLogs).where(eq(dailyLogs.userId, req.user.id)),
    db.select().from(schedules).where(eq(schedules.userId, req.user.id)),
    db.select().from(vetVisits).where(eq(vetVisits.userId, req.user.id)),
    db.select().from(aiLogs).where(eq(aiLogs.userId, req.user.id)),
    db.select().from(weightRecords).where(eq(weightRecords.userId, req.user.id)),
  ]);
  res.json({ exportedAt: new Date().toISOString(), dogs: userDogs, dailyLogs: userLogs, schedules: userSchedules, vetVisits: userVetVisits, aiLogs: userAiLogs, weightRecords: userWeights });
});

// ── AI 분석 API ────────────────────────────────────────────────────────────────
app.post("/api/analyze", authMiddleware, async (req, res) => {
  const { dog, symptoms } = req.body;
  if (!symptoms?.trim()) return res.status(400).json({ error: "증상을 입력해주세요." });
  try {
    const dogInfo = dog ? `강아지 정보:\n- 이름: ${dog.name}\n- 견종: ${dog.breed}\n- 나이: ${dog.age}살\n- 체중: ${dog.weight}kg\n- 성별: ${dog.gender === "male" ? "수컷" : "암컷"}\n- 중성화: ${dog.neutered ? "완료" : "미완료"}\n\n` : "";
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: `당신은 경험 많은 반려견 전문 수의사 AI입니다. 보호자가 입력한 증상과 강아지 정보를 바탕으로 응급도를 정확히 판단해주세요.`,
      messages: [{ role: "user", content: `${dogInfo}증상: ${symptoms}\n\n다음 JSON 형식으로만 응답해주세요:\n{\n  "urgency": "home" 또는 "tomorrow" 또는 "now",\n  "summary": "증상 요약 및 의심 질환 (1-2문장)",\n  "advice": "구체적인 케어 방법 또는 주의사항",\n  "nextSteps": ["단계1", "단계2", "단계3"]\n}` }],
    });
    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI 응답 파싱 실패");
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." });
  }
});

async function callHfAudio(audioBuffer, mimeType) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const hfRes = await fetch("https://api-inference.huggingface.co/models/MIT/ast-finetuned-audioset-10-10-0.4593", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": mimeType || "audio/webm" },
        body: audioBuffer,
      });
      const data = await hfRes.json();
      if (!data.error) return data;
      const msg = data.error.toLowerCase();
      if (msg.includes("loading")) {
        const wait = data.estimated_time ? Math.min(data.estimated_time * 1000, 20000) : 8000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (msg.includes("terminated") && attempt < 3) { await new Promise((r) => setTimeout(r, 3000)); continue; }
      return null;
    } catch { if (attempt < 3) await new Promise((r) => setTimeout(r, 2000)); }
  }
  return null;
}

app.post("/api/classify-audio", authMiddleware, async (req, res) => {
  const { audioBase64, mimeType, dog, context } = req.body;
  if (!audioBase64) return res.status(400).json({ error: "오디오가 없습니다." });
  const dogInfo = dog ? `이름: ${dog.name}, 견종: ${dog.breed}, 나이: ${dog.age}살` : "강아지 정보 없음";
  try {
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const hfData = await callHfAudio(audioBuffer, mimeType);
    const topLabels = Array.isArray(hfData) ? hfData.slice(0, 5).map((r) => `${r.label} (${(r.score * 100).toFixed(0)}%)`).join(", ") : "알 수 없음";
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001", max_tokens: 400,
      system: "당신은 강아지 언어를 유쾌하고 재치있게 번역해주는 AI입니다.",
      messages: [{ role: "user", content: `강아지 정보: ${dogInfo}\n오디오 분석 결과: ${topLabels}\n상황: ${context || "알 수 없음"}\n\n다음 JSON 형식으로만 응답해주세요:\n{\n  "translation": "강아지가 하는 말 (1인칭, 2-3문장)",\n  "mood": "현재 기분 한 단어",\n  "moodEmoji": "기분을 표현하는 이모지 1개",\n  "detectedSound": "감지된 소리 한국어로",\n  "confidence": "번역 신뢰도 0-65 숫자"\n}` }],
    });
    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("파싱 실패");
    const result = JSON.parse(jsonMatch[0]);
    result.rawLabels = topLabels;
    res.json(result);
  } catch (err) { console.error(err.message); res.status(500).json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." }); }
});

app.post("/api/translate", authMiddleware, async (req, res) => {
  const { dog, barkType, context } = req.body;
  if (!barkType || !context) return res.status(400).json({ error: "짖음 유형과 상황을 선택해주세요." });
  const dogInfo = dog ? `이름: ${dog.name}, 견종: ${dog.breed}, 나이: ${dog.age}살` : "강아지 정보 없음";
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001", max_tokens: 400,
      system: "당신은 강아지 언어를 유쾌하고 재치있게 번역해주는 AI입니다.",
      messages: [{ role: "user", content: `강아지 정보: ${dogInfo}\n짖음 유형: ${barkType}\n상황: ${context}\n\n다음 JSON 형식으로만 응답해주세요:\n{\n  "translation": "강아지가 하는 말 (1인칭, 2-3문장)",\n  "mood": "현재 기분 한 단어",\n  "moodEmoji": "기분을 표현하는 이모지 1개",\n  "confidence": "번역 신뢰도 0-60 숫자"\n}` }],
    });
    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("파싱 실패");
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) { console.error(err.message); res.status(500).json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." }); }
});

app.post("/api/analyze-product", authMiddleware, async (req, res) => {
  const { dog, imageBase64, mediaType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "이미지를 업로드해주세요." });
  const dogInfo = dog ? `강아지: ${dog.name}, 견종: ${dog.breed}, 나이: ${dog.age}살, 체중: ${dog.weight}kg` : "";
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 800,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
        { type: "text", text: `사진을 분석해주세요.${dogInfo ? `\n보호자 강아지 정보: ${dogInfo}` : ""}\n\n먼저 사진이 "사람이 먹는 음식/식재료"인지, "반려견 용품/제품"인지 판단하세요.\n\n【사람 음식/식재료인 경우】\n{\n  "contentType": "food",\n  "foodName": "음식/식재료 이름",\n  "safety": "safe" 또는 "caution" 또는 "danger",\n  "safetyLabel": "안전해요" 또는 "주의 필요" 또는 "위험해요",\n  "reason": "왜 안전한지/위험한지 핵심 이유 (1-2문장)",\n  "symptoms": ["위험/주의 시 증상들"],\n  "tip": "보호자에게 전달할 팁 한 줄"\n}\n\n【반려견 용품/제품인 경우】\n{\n  "contentType": "product",\n  "productName": "제품명",\n  "category": "사료/간식/장난감/의약품/용품 중 하나",\n  "description": "제품 설명 (2-3문장)",\n  "mainIngredients": ["주요 성분"],\n  "feedingGuide": "1일 급여량과 횟수 (사료/간식이 아니면 빈 문자열)",\n  "suitableAge": "적합한 나이대",\n  "cautions": ["주의사항"],\n  "rating": "추천/보통/주의 중 하나",\n  "ratingReason": "추천 여부 이유 (1문장)"\n}` },
      ]}],
    });
    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("파싱 실패");
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) { console.error(err.message); res.status(500).json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." }); }
});

app.post("/api/parse-receipt", authMiddleware, async (req, res) => {
  const { imageBase64, mediaType, dog } = req.body;
  if (!imageBase64) return res.status(400).json({ error: "이미지를 업로드해주세요." });
  const dogInfo = dog ? `\n보호자 강아지 정보: 이름: ${dog.name}, 견종: ${dog.breed}, 나이: ${dog.age}살, 체중: ${dog.weight}kg` : "";
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 1000,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } },
        { type: "text", text: `이 동물병원 영수증/진료확인서/진단서 사진을 분석해서 진료 내역을 추출해주세요.${dogInfo}\n\n다음 JSON 형식으로만 응답해주세요:\n{\n  "hospitalName": "병원 이름",\n  "visitDate": "방문 날짜 YYYY-MM-DD",\n  "items": [{ "name": "진료 항목명", "price": 금액 }],\n  "totalPrice": 총금액,\n  "diagnosis": "진단명",\n  "prescriptions": ["처방 약품명"],\n  "nextVisitDate": "다음 내원일 YYYY-MM-DD",\n  "notes": "기타 특이사항",\n  "confidence": "high/medium/low"\n}` },
      ]}],
    });
    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("파싱 실패");
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) { console.error(err.message); res.status(500).json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." }); }
});

// ── 행동/훈련 상담 ────────────────────────────────────────────────────────────
app.post("/api/ask-behavior", authMiddleware, async (req, res) => {
  const { question, dog } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: "질문을 입력해주세요." });
  const dogInfo = dog ? `강아지 정보: 이름 ${dog.name}, 견종 ${dog.breed}, 나이 ${dog.age}살, 체중 ${dog.weight ? dog.weight + "kg" : "미입력"}, 성별 ${dog.gender === "male" ? "수컷" : "암컷"}${dog.neutered ? " (중성화)" : ""}` : "";
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001", max_tokens: 1200,
      system: "당신은 전문 반려견 훈련사이자 행동 전문가입니다. 반드시 순수한 JSON만 출력하세요. 마크다운, 설명, 코드블록 없이 JSON 객체만 출력합니다.",
      messages: [{ role: "user", content: `${dogInfo ? dogInfo + "\n\n" : ""}질문: ${question.trim()}\n\n아래 JSON 형식으로만 응답하세요 (steps는 최대 3개):\n{"category":"행동문제","summary":"한 줄 요약","cause":"원인 설명","steps":[{"step":1,"title":"단계명","desc":"설명"}],"tips":["팁1","팁2"],"caution":"주의사항"}` }],
    });
    const text = message.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI 응답 파싱 실패");
    const result = JSON.parse(jsonMatch[0]);
    // ai_logs에 저장
    await db.insert(aiLogs).values({ id: crypto.randomUUID(), userId: req.user.id, type: "behavior", dogName: dog?.name ?? "미등록", input: question.trim(), result });
    res.json(result);
  } catch (err) { console.error(err.message); res.status(500).json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." }); }
});

// ── 음식 독성 체크 ────────────────────────────────────────────────────────────
app.post("/api/check-food", authMiddleware, async (req, res) => {
  const { food, dogName } = req.body;
  if (!food?.trim()) return res.status(400).json({ error: "음식 이름을 입력해주세요." });
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001", max_tokens: 500,
      messages: [{ role: "user", content: `강아지${dogName ? ` (이름: ${dogName})` : ""}가 "${food}"를 먹어도 되는지 판단해주세요.\n\n반드시 다음 JSON 형식으로만 응답하세요:\n{\n  "food": "음식/식재료 이름",\n  "safety": "safe" 또는 "caution" 또는 "danger",\n  "safetyLabel": "안전해요" 또는 "주의 필요" 또는 "위험해요",\n  "reason": "핵심 이유 1-2문장",\n  "symptoms": ["섭취 시 나타날 수 있는 증상 (danger/caution만)"],\n  "tip": "보호자에게 전달할 팁 한 줄"\n}` }],
    });
    const jsonMatch = message.content[0].text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("파싱 실패");
    const result = JSON.parse(jsonMatch[0]);
    // ai_logs에 저장
    await db.insert(aiLogs).values({ id: crypto.randomUUID(), userId: req.user.id, type: "food", dogName: dogName ?? "미등록", input: food.trim(), result });
    res.json(result);
  } catch (err) { console.error(err.message); res.status(500).json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." }); }
});

// ── 건강 리포트 HTML ────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

app.get("/api/report/:dogId", authMiddleware, async (req, res) => {
  const { dogId } = req.params;
  try {
    const [dogRows, logRows, vaccineRows, vetRows] = await Promise.all([
      db.select().from(dogs).where(and(eq(dogs.id, dogId), eq(dogs.userId, req.user.id))),
      db.select().from(dailyLogs).where(and(eq(dailyLogs.dogId, dogId), eq(dailyLogs.userId, req.user.id))).orderBy(dailyLogs.date),
      db.select().from(vaccines).where(and(eq(vaccines.dogId, dogId), eq(vaccines.userId, req.user.id))).orderBy(vaccines.date),
      db.select().from(vetVisits).where(eq(vetVisits.userId, req.user.id)).orderBy(vetVisits.visitDate),
    ]);
    if (!dogRows[0]) return res.status(404).json({ error: "강아지를 찾을 수 없어요." });
    const dog = dogRows[0];
    const recentLogs = logRows.slice(-30);
    const MEAL_LABEL = ["안먹음", "조금", "보통", "잘먹음"];
    const ENERGY_LABEL = ["축처짐", "보통", "활발"];
    const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    const dn = escapeHtml(dog.name), db_ = escapeHtml(dog.breed);
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${dn} 건강 리포트</title>
<style>
  body { font-family: 'Apple SD Gothic Neo', sans-serif; padding: 32px; max-width: 720px; margin: 0 auto; color: #111; }
  h1 { font-size: 22px; margin-bottom: 4px; } .sub { color: #888; font-size: 13px; margin-bottom: 24px; }
  h2 { font-size: 15px; border-bottom: 2px solid #111; padding-bottom: 6px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
  th { background: #f5f5f5; padding: 8px; text-align: left; font-weight: 600; }
  td { padding: 7px 8px; border-bottom: 1px solid #eee; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 700; }
  .safe { background: #dcfce7; color: #166534; } .caution { background: #fef9c3; color: #854d0e; } .danger { background: #fee2e2; color: #991b1b; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<h1>${dn} 건강 리포트</h1>
<div class="sub">출력일: ${today} | 견종: ${db_} | 나이: ${dog.age}살 | 체중: ${dog.weight ? dog.weight + "kg" : "미입력"} | 성별: ${dog.gender === "male" ? "수컷" : "암컷"}${dog.neutered ? " (중성화)" : ""}</div>

<h2>최근 30일 일일 건강 기록</h2>
<table>
  <tr><th>날짜</th><th>식사</th><th>기력</th><th>산책</th><th>배변</th><th>소변</th><th>메모</th></tr>
  ${recentLogs.reverse().map(l => `<tr><td>${escapeHtml(l.date)}</td><td>${MEAL_LABEL[l.meal]}</td><td>${ENERGY_LABEL[l.energy]}</td><td>${l.walk ? "O" : "-"}</td><td>${l.poop ? "O" : "-"}</td><td>${l.pee ? "O" : "-"}</td><td>${escapeHtml(l.memo || "")}</td></tr>`).join("")}
  ${recentLogs.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#888">기록 없음</td></tr>' : ""}
</table>

<h2>예방접종 이력</h2>
<table>
  <tr><th>백신명</th><th>접종일</th><th>병원</th><th>다음 접종</th></tr>
  ${vaccineRows.map(v => `<tr><td>${escapeHtml(v.vaccineName)}</td><td>${escapeHtml(v.date)}</td><td>${escapeHtml(v.hospitalName || "-")}</td><td>${escapeHtml(v.nextDate || "-")}</td></tr>`).join("")}
  ${vaccineRows.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#888">기록 없음</td></tr>' : ""}
</table>

<h2>검진 기록</h2>
<table>
  <tr><th>날짜</th><th>병원</th><th>진단</th><th>금액</th></tr>
  ${vetRows.map(v => `<tr><td>${escapeHtml(v.visitDate)}</td><td>${escapeHtml(v.hospitalName)}</td><td>${escapeHtml(v.diagnosis || "-")}</td><td>${v.totalPrice ? v.totalPrice.toLocaleString() + "원" : "-"}</td></tr>`).join("")}
  ${vetRows.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#888">기록 없음</td></tr>' : ""}
</table>

<script>window.onload = () => window.print();</script>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) { console.error(err.message); res.status(500).json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." }); }
});

// ── 사용자 피드백 + 관리자 알림 ──────────────────────────────────────────────
app.post("/api/feedback", authMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "내용을 입력해주세요." });

  const userName = req.user.name || "사용자";
  console.log(`[피드백] ${userName}: ${message.trim()}`);

  // 관리자에게 푸시 알림 전송
  try {
    const adminRows = await db.select().from(users).where(eq(users.role, "admin"));
    const adminIds = new Set(adminRows.map((a) => a.id));
    const adminSubs = [...subscriptions.entries()].filter(([, s]) => adminIds.has(s.userId));
    const payload = JSON.stringify({
      title: `피드백: ${userName}`,
      body: message.trim().slice(0, 200),
      icon: "/icons/icon-192x192.png",
    });
    for (const [clientId, sub] of adminSubs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) subscriptions.delete(clientId);
      }
    }
  } catch (e) { console.error("관리자 알림 전송 실패:", e.message); }

  res.json({ ok: true });
});

// ── 음성/자연어 명령 파싱 ─────────────────────────────────────────────────────
app.post("/api/voice-command", authMiddleware, async (req, res) => {
  const { transcript, dogs: dogList = [], today, history = [] } = req.body;
  if (!transcript?.trim()) return res.status(400).json({ error: "입력 내용이 없어요." });
  try {
    const dogsInfo = dogList.length > 0
      ? dogList.map((d) => `- ${d.name} (id: ${d.id}, 견종: ${d.breed || "?"}, ${d.age || 0}살)`).join("\n")
      : "등록된 강아지 없음";

    const systemPrompt = `오늘 날짜: ${today}.
등록된 강아지 목록:
${dogsInfo}

사용자의 자연어 입력에서 인텐트와 데이터를 추출해 반드시 JSON 형식으로만 응답하세요.
다른 텍스트 없이 JSON만 출력하세요.

지원하는 intent:
- "schedule": 스케줄/알림 추가
- "vetVisit": 진료 기록 추가
- "vaccine": 예방접종 기록 추가
- "weight": 체중 기록
- "clarify": 중요한 정보가 부족해 되물어야 할 때
- "unknown": 위 중 어느 것도 아닐 때

규칙:
- 날짜는 YYYY-MM-DD 형식 (오늘=${today}, 상대 날짜를 절대값으로 변환)
- 시간은 HH:MM 형식
- 강아지 이름이 언급되면 dogs 목록에서 id 매칭
- 강아지가 1마리뿐이면 이름 미언급 시 그 강아지로 자동 매칭
- 강아지가 여러 마리인데 이름 미언급이면 clarify
- 미언급 필드는 null
- repeat: "daily"|"weekly"|"monthly"|"none" (미언급 시 "none")
- schedule type: "meal"|"medicine"|"walk"|"vaccine"

응답 형식:
schedule: {"intent":"schedule","data":{"type":"meal|medicine|walk|vaccine","title":"제목","time":"HH:MM or null","repeat":"none","dogId":"id or null","dogName":"이름 or null","vaccineDate":"YYYY-MM-DD or null","medicineName":"약이름 or null"}}
vetVisit: {"intent":"vetVisit","data":{"dogName":"이름 or null","hospitalName":"병원명 or null","visitDate":"YYYY-MM-DD","diagnosis":"진단 or null","nextVisitDate":"YYYY-MM-DD or null","notes":"메모 or null","items":[],"totalPrice":0,"prescriptions":[]}}
vaccine: {"intent":"vaccine","data":{"dogId":"id or null","dogName":"이름 or null","vaccineName":"백신명","date":"YYYY-MM-DD","hospitalName":"병원명 or null","nextDate":"YYYY-MM-DD or null","notes":""}}
weight: {"intent":"weight","data":{"dogId":"id or null","dogName":"이름 or null","weight":숫자,"date":"YYYY-MM-DD"}}
clarify: {"intent":"clarify","question":"구체적인 질문"}
unknown: {"intent":"unknown"}`;

    const messages = [...history, { role: "user", content: transcript }];
    const result = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });
    const text = result.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("파싱 실패");
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error("[voice-command]", err.message);
    res.status(500).json({ error: "서버 오류가 발생했어요." });
  }
});

// ── 데이터 내보내기 CSV ──────────────────────────────────────────────────────
function csvSafe(str) {
  const s = String(str ?? "");
  if (/^[=+\-@\t\r]/.test(s)) return `'${s}`;
  return s;
}
app.get("/api/export/:dogId", authMiddleware, async (req, res) => {
  const { dogId } = req.params;
  try {
    const [dogRows, logRows, weightRows, vaccineRows, vetRows] = await Promise.all([
      db.select().from(dogs).where(and(eq(dogs.id, dogId), eq(dogs.userId, req.user.id))),
      db.select().from(dailyLogs).where(and(eq(dailyLogs.dogId, dogId), eq(dailyLogs.userId, req.user.id))).orderBy(dailyLogs.date),
      db.select().from(weightRecords).where(and(eq(weightRecords.dogId, dogId), eq(weightRecords.userId, req.user.id))).orderBy(weightRecords.date),
      db.select().from(vaccines).where(and(eq(vaccines.dogId, dogId), eq(vaccines.userId, req.user.id))).orderBy(vaccines.date),
      db.select().from(vetVisits).where(eq(vetVisits.userId, req.user.id)).orderBy(vetVisits.visitDate),
    ]);
    if (!dogRows[0]) return res.status(404).json({ error: "강아지를 찾을 수 없어요." });
    const dog = dogRows[0];
    const MEAL = ["안먹음", "조금", "보통", "잘먹음"];
    const ENERGY = ["축처짐", "보통", "활발"];
    const BOM = "\uFEFF";
    let csv = BOM;
    csv += `${dog.name} 건강 데이터 내보내기\n\n`;
    csv += "=== 일일 건강 기록 ===\n";
    csv += "날짜,식사,기력,산책,배변,소변,메모\n";
    for (const l of logRows) {
      csv += `${l.date},${MEAL[l.meal]},${ENERGY[l.energy]},${l.walk ? "O" : ""},${l.poop ? "O" : ""},${l.pee ? "O" : ""},"${csvSafe((l.memo || "").replace(/"/g, '""'))}"\n`;
    }
    csv += "\n=== 체중 기록 ===\n날짜,체중(kg)\n";
    for (const w of weightRows) csv += `${w.date},${w.weight}\n`;
    csv += "\n=== 예방접종 ===\n백신명,접종일,병원,다음접종\n";
    for (const v of vaccineRows) csv += `${csvSafe(v.vaccineName)},${v.date},${csvSafe(v.hospitalName || "")},${v.nextDate || ""}\n`;
    csv += "\n=== 검진 기록 ===\n날짜,병원,진단,금액\n";
    for (const v of vetRows) csv += `${v.visitDate},${csvSafe(v.hospitalName)},"${csvSafe((v.diagnosis || "").replace(/"/g, '""'))}",${v.totalPrice || 0}\n`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(dog.name)}_health_data.csv"`);
    res.send(csv);
  } catch (err) { console.error(err.message); res.status(500).json({ error: "서버 오류" }); }
});

// ── 자동 푸시 알림 (생일 + 예방약) ────────────────────────────────────────────
async function sendAutoPushNotifications() {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const isFirstOfMonth = dd === "01";

  try {
    // 생일 알림: birthday 필드가 --MM-DD 또는 YYYY-MM-DD 형식
    const allDogs = await db.select().from(dogs);
    for (const dog of allDogs) {
      if (!dog.birthday) continue;
      const parts = dog.birthday.split("-");
      const dogMM = parts[parts.length - 2];
      const dogDD = parts[parts.length - 1];
      if (dogMM === mm && dogDD === dd) {
        const userSubs = [...subscriptions.entries()].filter(([, s]) => s.userId === dog.userId);
        for (const [, sub] of userSubs) {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys },
              JSON.stringify({ title: `${dog.name} 생일이에요 🎂`, body: "오늘은 특별히 좋아하는 간식을 챙겨주세요!", icon: "/icon-192.png" }));
          } catch {}
        }
      }
    }

    // 예방약 알림: 매달 1일에 당월 예방약 미투약 강아지 보호자에게 알림
    if (isFirstOfMonth) {
      const yearMonth = `${today.getFullYear()}-${mm}`;
      const doneMeds = await db.select().from(preventionMeds).where(and(eq(preventionMeds.yearMonth, yearMonth), eq(preventionMeds.done, true)));
      const doneSet = new Set(doneMeds.map(m => `${m.dogId}-${m.type}`));
      const MED_TYPES = ["심장사상충", "벼룩/진드기", "내부기생충"];
      const notifiedUsers = new Set();
      for (const dog of allDogs) {
        if (notifiedUsers.has(dog.userId)) continue;
        const hasMissing = MED_TYPES.some(t => !doneSet.has(`${dog.id}-${t}`));
        if (!hasMissing) continue;
        const userSubs = [...subscriptions.entries()].filter(([, s]) => s.userId === dog.userId);
        for (const [, sub] of userSubs) {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys },
              JSON.stringify({ title: "이번 달 예방약 체크!", body: `${dog.name}의 심장사상충/벼룩 예방약을 확인해주세요 💊`, icon: "/icon-192.png" }));
            notifiedUsers.add(dog.userId);
          } catch {}
        }
      }
    }
  } catch (err) { console.error("자동 알림 오류:", err.message); }
}

// 매일 오전 9시 체크 (서버 시작 후 매 시간 확인, 9시에만 실행)
setInterval(() => {
  const h = new Date().getHours();
  if (h === 9) sendAutoPushNotifications();
}, 1000 * 60 * 60);

// ── 정적 파일 서빙 ────────────────────────────────────────────────────────────
const distDir = path.join(__dirname, "dist/public");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res) => { res.sendFile(path.join(distDir, "index.html")); });
}

const PORT = process.env.PORT ?? 3099;
app.listen(PORT, () => { console.log(`서버 실행 중: http://localhost:${PORT}`); });
