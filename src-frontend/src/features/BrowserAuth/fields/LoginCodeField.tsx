import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useController, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import isNumeric from "validator/lib/isNumeric";
import { Field, FieldError } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { BROWSER_AUTH_NAMESPACE } from "@/i18n/resources";
import type { BrowserLoginFormValues } from "../BrowserLoginView";

export function LoginCodeField() {
  const { t } = useTranslation(BROWSER_AUTH_NAMESPACE);
  const { control } = useFormContext<BrowserLoginFormValues>();
  const { field, fieldState } = useController({
    control,
    name: "code",
    rules: {
      required: t("login.code.error.required"),
      validate: (value) =>
        (value.length === 6 && isNumeric(value, { no_symbols: true })) || t("login.code.error.format"),
    },
  });

  return (
    <Field data-invalid={fieldState.invalid}>
      <InputOTP
        id="browser-login-code"
        aria-invalid={fieldState.invalid}
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS}
        value={field.value}
        onBlur={field.onBlur}
        onChange={field.onChange}
      >
        <InputOTPGroup className="shadow-xs rounded-md">
          {Array.from({ length: 6 }, (_, index) => (
            <InputOTPSlot className="size-10 text-base" index={index} key={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}
