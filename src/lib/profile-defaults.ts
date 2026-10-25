import type { Profile } from "@/db/schema";
import { maskPhone } from "./masks";

export function profileDefaults(p: Profile) {
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    dni: p.dni ?? "",
    phone: p.phone ? maskPhone(p.phone) : "",
    birthDate: p.birthDate ?? "",
    insurance: p.insurance ?? "",
  };
}
