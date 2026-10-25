/** Código de Postgres para violación de restricción de exclusión (turno superpuesto). */
export function isOverlapError(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23P01" || err?.cause?.code === "23P01";
}
