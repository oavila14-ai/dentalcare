"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfileAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { FormAlert } from "./form-alert";
import { ProfileFields } from "./profile-fields";

export function ProfileForm({
  defaults,
  needsPrivacy,
  redirectTo,
  submitLabel = "Guardar cambios",
}: {
  defaults: ProfileInput;
  needsPrivacy: boolean;
  redirectTo?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [privacy, setPrivacy] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    setError: setFieldError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(profileSchema), defaultValues: defaults });

  const onSubmit = handleSubmit(async (values) => {
    setError(undefined);
    if (needsPrivacy && !privacy) return setError("Debes aceptar la política de privacidad");
    const res = await updateProfileAction(values, privacy);
    if (!res.ok) {
      setError(res.error);
      for (const [field, message] of Object.entries(res.fieldErrors ?? {})) {
        setFieldError(field as keyof ProfileInput, { message });
      }
      return;
    }
    toast.success("Datos guardados");
    if (redirectTo) router.replace(redirectTo);
    else router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormAlert>{error}</FormAlert>
      <ProfileFields register={register} setValue={setValue} errors={errors} />
      {needsPrivacy && (
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox checked={privacy} onCheckedChange={(v) => setPrivacy(v === true)} className="mt-0.5" />
          <span className="text-muted-foreground">
            Acepto la <Link href="/privacidad" target="_blank" className="font-medium text-primary hover:underline">política de privacidad</Link>.
          </span>
        </label>
      )}
      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={isSubmitting} disabled={!needsPrivacy && !isDirty}>
        {submitLabel}
      </Button>
    </form>
  );
}
