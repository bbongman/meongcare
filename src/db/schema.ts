import { pgTable, text, boolean, integer, real, jsonb, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  hash: text("hash").notNull(),
  role: text("role").notNull().default("user"),
  gender: text("gender"),
  phone: text("phone"),
  memo: text("memo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dogs = pgTable("dogs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

export const dailyLogs = pgTable("daily_logs", {
  id: text("id").primaryKey(),
  dogId: text("dog_id").notNull().references(() => dogs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  meal: integer("meal").notNull().default(0),
  walk: boolean("walk").default(false),
  poop: boolean("poop").default(false),
  pee: boolean("pee").default(false),
  energy: integer("energy").notNull().default(1),
  memo: text("memo").default(""),
});

export const vetVisits = pgTable("vet_visits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

export const vaccines = pgTable("vaccines", {
  id: text("id").primaryKey(),
  dogId: text("dog_id").notNull().references(() => dogs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vaccineName: text("vaccine_name").notNull(),
  date: text("date").notNull(),
  hospitalName: text("hospital_name").default(""),
  nextDate: text("next_date").default(""),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const preventionMeds = pgTable("prevention_meds", {
  id: text("id").primaryKey(),
  dogId: text("dog_id").notNull().references(() => dogs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  yearMonth: text("year_month").notNull(),
  done: boolean("done").default(false),
  doneAt: text("done_at"),
  productName: text("product_name"),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  tabOrder: jsonb("tab_order").default([]),
  theme: text("theme").default("system"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull().unique(),
  endpoint: text("endpoint").notNull(),
  keys: jsonb("keys").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiLogs = pgTable("ai_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "consultation" | "translation" | "product"
  dogName: text("dog_name").notNull(),
  input: text("input").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schedules = pgTable("schedules", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
