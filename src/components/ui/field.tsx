"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

/**
 * Envoltorio de campo de formulario: etiqueta + control + ayuda/error.
 * Si no se indica `htmlFor`, asocia la etiqueta al control hijo generando un id.
 */
function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const autoId = React.useId();
  const child = React.isValidElement<{ id?: string; "aria-describedby"?: string }>(children) ? children : null;
  const id = htmlFor ?? child?.props.id ?? autoId;
  const messageId = `${id}-msg`;
  const control =
    child && !htmlFor
      ? React.cloneElement(child, { id, "aria-describedby": error || hint ? messageId : undefined })
      : children;

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {control}
      {error ? (
        <p id={messageId} role="alert" className="text-[13px] font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[13px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export { Field };
