import { z } from "zod";

/** DNI hondureño: 13 dígitos, formato 0801-1990-12345. */
export function normalizeDni(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 13) return input.trim();
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
}

/** Teléfono hondureño: 8 dígitos, se guarda como +504 XXXX-XXXX. */
export function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("504")) digits = digits.slice(3);
  if (digits.length !== 8) return input.trim();
  return `+504 ${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export const dniSchema = z
  .string()
  .trim()
  .transform(normalizeDni)
  .pipe(z.string().regex(/^\d{4}-\d{4}-\d{5}$/, "El DNI debe tener 13 dígitos (ej. 0801-1990-12345)"));

export const phoneSchema = z
  .string()
  .trim()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\+504 [2-9]\d{3}-\d{4}$/, "Ingresa un teléfono de 8 dígitos (ej. 9999-9999)"));

const name = (label: string) =>
  z.string().trim().min(2, `Ingresa tu ${label}`).max(60, `${label} demasiado largo`);

const birthDate = z
  .string()
  .trim()
  .refine((v) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v);
    return d.getFullYear() >= 1900 && d <= new Date();
  }, "Fecha de nacimiento inválida");

export const profileSchema = z.object({
  firstName: name("nombre"),
  lastName: name("apellido"),
  dni: dniSchema,
  phone: phoneSchema,
  birthDate,
  insurance: z.string().trim().max(80).optional().default(""),
});

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[A-Za-z]/, "Debe incluir al menos una letra")
  .regex(/\d/, "Debe incluir al menos un número");

export const signUpSchema = profileSchema.extend({
  email: z.email("Email inválido").trim().toLowerCase(),
  password: passwordSchema,
  privacy: z.literal(true, { error: "Debes aceptar la política de privacidad" }),
});

export const loginSchema = z.object({
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const requestAppointmentSchema = z.object({
  serviceId: z.uuid(),
  professionalId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  notes: z.string().trim().max(500, "Máximo 500 caracteres").optional().default(""),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido").max(80),
  description: z.string().trim().max(300).optional().default(""),
  durationMin: z.coerce.number().int().min(5, "Mínimo 5 minutos").max(480, "Máximo 8 horas"),
  price: z
    .union([z.literal(""), z.coerce.number().min(0, "Precio inválido")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
  icon: z.string().min(1),
  active: z.boolean().default(true),
});

export type SignUpInput = z.input<typeof signUpSchema>;
export type ProfileInput = z.input<typeof profileSchema>;

/** Convierte los errores de Zod a { campo: mensaje } para mostrarlos en el formulario. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
