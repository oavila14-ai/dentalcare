/** Máscaras de entrada para formularios (se aplican mientras el usuario escribe). */
export function maskDni(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
}

export function maskPhone(value: string) {
  let d = value.replace(/\D/g, "");
  if (d.startsWith("504") && d.length > 8) d = d.slice(3);
  d = d.slice(0, 8);
  return d.length <= 4 ? d : `${d.slice(0, 4)}-${d.slice(4)}`;
}

/** "+504 9999-0000" → "9999-0000" para mostrar en el input. */
export function phoneForInput(value?: string | null) {
  return value ? maskPhone(value) : "";
}
