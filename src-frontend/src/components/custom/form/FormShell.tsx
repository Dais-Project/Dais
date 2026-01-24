import {
  type FieldValues,
  FormProvider,
  type SubmitHandler,
  useForm,
} from "react-hook-form";
import { FieldGroup } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type FormShellProps<T extends FieldValues> = {
  values?: T;
  onSubmit: SubmitHandler<T>;
  children: React.ReactNode;
  className?: string;
};

export function FormShell<T extends FieldValues>({
  values,
  onSubmit,
  children,
  className,
}: FormShellProps<T>) {
  const methods = useForm<T>({
    values,
    resetOptions: {
      keepDirtyValues: true,
      keepTouched: true,
      keepErrors: true,
    },
  });

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className={cn("py-4", className)}
      >
        <FieldGroup className="gap-y-2">{children}</FieldGroup>
      </form>
    </FormProvider>
  );
}

type FormShellFooterProps = {
  children: React.ReactNode;
  className?: string;
};

export function FormShellFooter({ children, className }: FormShellFooterProps) {
  return (
    <div className={cn("mt-4 flex justify-end", className)}>{children}</div>
  );
}
