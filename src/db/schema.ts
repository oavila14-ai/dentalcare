/**
 * Esquema tipado para Drizzle. La fuente de verdad del esquema son las
 * migraciones SQL en `supabase/migrations` (incluyen triggers, RLS y la
 * restricción anti-solapamiento); este archivo debe reflejarlas.
 */
import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["patient", "admin"]);
export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
  "completed",
  "no_show",
]);

const tz = { withTimezone: true } as const;

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: userRole("role").notNull().default("patient"),
  email: text("email").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  dni: text("dni").unique(),
  phone: text("phone"),
  birthDate: date("birth_date"),
  insurance: text("insurance"),
  privacyAcceptedAt: timestamp("privacy_accepted_at", tz),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

export const professionals = pgTable("professionals", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  title: text("title").notNull().default("Dr."),
  specialty: text("specialty").notNull().default("Odontología general"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  durationMin: integer("duration_min").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }),
  color: text("color").notNull().default("#0ea5a4"),
  icon: text("icon").notNull().default("sparkles"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
});

export const professionalServices = pgTable(
  "professional_services",
  {
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.professionalId, t.serviceId] })],
);

export const workingHours = pgTable("working_hours", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id, { onDelete: "cascade" }),
  weekday: smallint("weekday").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
});

export const timeOff = pgTable("time_off", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", tz).notNull(),
  endsAt: timestamp("ends_at", tz).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  professionalId: uuid("professional_id")
    .notNull()
    .references(() => professionals.id),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  startsAt: timestamp("starts_at", tz).notNull(),
  endsAt: timestamp("ends_at", tz).notNull(),
  status: appointmentStatus("status").notNull().default("pending"),
  patientNotes: text("patient_notes"),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  confirmedAt: timestamp("confirmed_at", tz),
  cancelledAt: timestamp("cancelled_at", tz),
  reminderSentAt: timestamp("reminder_sent_at", tz),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

export const appointmentEvents = pgTable("appointment_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  appointmentId: uuid("appointment_id")
    .notNull()
    .references(() => appointments.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  fromStatus: appointmentStatus("from_status"),
  toStatus: appointmentStatus("to_status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", tz).notNull().defaultNow(),
});

export const clinicSettings = pgTable("clinic_settings", {
  id: smallint("id").primaryKey().default(1),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp").notNull(),
  email: text("email").notNull(),
  mapsUrl: text("maps_url").notNull(),
  timezone: text("timezone").notNull(),
  minHoursBeforeBooking: integer("min_hours_before_booking").notNull(),
  maxDaysAhead: integer("max_days_ahead").notNull(),
  cancellationHours: integer("cancellation_hours").notNull(),
  slotStepMin: integer("slot_step_min").notNull(),
  maxActivePerPatient: integer("max_active_per_patient").notNull(),
  updatedAt: timestamp("updated_at", tz).notNull().defaultNow(),
});

// ─── Relaciones (para db.query.*) ───────────────────────────────────
export const profilesRelations = relations(profiles, ({ many }) => ({
  appointments: many(appointments),
}));

export const professionalsRelations = relations(professionals, ({ many }) => ({
  services: many(professionalServices),
  workingHours: many(workingHours),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  professionals: many(professionalServices),
}));

export const professionalServicesRelations = relations(professionalServices, ({ one }) => ({
  professional: one(professionals, {
    fields: [professionalServices.professionalId],
    references: [professionals.id],
  }),
  service: one(services, { fields: [professionalServices.serviceId], references: [services.id] }),
}));

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  professional: one(professionals, {
    fields: [workingHours.professionalId],
    references: [professionals.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  patient: one(profiles, { fields: [appointments.patientId], references: [profiles.id] }),
  professional: one(professionals, {
    fields: [appointments.professionalId],
    references: [professionals.id],
  }),
  service: one(services, { fields: [appointments.serviceId], references: [services.id] }),
  events: many(appointmentEvents),
}));

export const appointmentEventsRelations = relations(appointmentEvents, ({ one }) => ({
  appointment: one(appointments, {
    fields: [appointmentEvents.appointmentId],
    references: [appointments.id],
  }),
  actor: one(profiles, { fields: [appointmentEvents.actorId], references: [profiles.id] }),
}));

export type Profile = typeof profiles.$inferSelect;
export type Professional = typeof professionals.$inferSelect;
export type Service = typeof services.$inferSelect;
export type WorkingHour = typeof workingHours.$inferSelect;
export type TimeOff = typeof timeOff.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type AppointmentStatus = (typeof appointmentStatus.enumValues)[number];
export type ClinicSettings = typeof clinicSettings.$inferSelect;
