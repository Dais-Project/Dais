import logo from "@shared/icon-square.png";
import { Loader2Icon } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { resetAuthSessionQuery, useBrowserLogin } from "@/api/auth";
import { FetchError } from "@/api/orval-mutator/custom-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BROWSER_AUTH_NAMESPACE } from "@/i18n/resources";
import { LoginCodeField } from "./fields/LoginCodeField";

export type BrowserLoginFormValues = {
  code: string;
};

type BrowserLoginViewProps = {
  onAuthenticated: () => void;
};

export function BrowserLoginView({ onAuthenticated }: BrowserLoginViewProps) {
  const { t } = useTranslation(BROWSER_AUTH_NAMESPACE);
  const form = useForm<BrowserLoginFormValues>({
    defaultValues: { code: "" },
  });
  const loginMutation = useBrowserLogin({
    mutation: {
      onError: (error) => {
        if (error instanceof FetchError && error.errorCode === "LOGIN_CODE_INVALID") {
          form.setError("code", { message: t("login.code.error.invalid") });
        }
      },
      onSuccess: async () => {
        form.reset();
        await resetAuthSessionQuery()
        await onAuthenticated();
      },
    },
  });

  const handleSubmit = (values: BrowserLoginFormValues) => {
    form.clearErrors("code");
    loginMutation.mutate({ data: values });
  };

  return (
    <Card className="w-fit py-8">
      <CardHeader className="flex flex-col items-center">
        <img alt="Dais" src={logo} className="size-16 rounded-lg" />
        <h1 className="text-xl font-semibold">{t("login.title")}</h1>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form className="flex flex-col gap-7" onSubmit={form.handleSubmit(handleSubmit)}>
            <LoginCodeField />
            <Button className="w-full rounded-md" disabled={loginMutation.isPending} type="submit">
              {loginMutation.isPending && <Loader2Icon className="animate-spin" />}
              {t("login.submit_button")}
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
