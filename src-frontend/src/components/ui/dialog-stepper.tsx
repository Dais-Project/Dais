import { useControllableState } from "@radix-ui/react-use-controllable-state";
import type * as React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type DialogStepperContextValue = {
  activeStep: number;
  steps: number;
  next: () => void;
  previous: () => void;
  goToStep: (step: number) => void;
};

const DialogStepperContext = createContext<DialogStepperContextValue | null>(null);

function normalizeSteps(steps: number) {
  if (!Number.isFinite(steps)) {
    return 1;
  }

  return Math.max(1, Math.trunc(steps));
}

function normalizeStep(step: number, steps: number) {
  if (!Number.isFinite(step)) {
    return 0;
  }

  return Math.min(Math.max(0, Math.trunc(step)), steps - 1);
}

function useDialogStepper() {
  const context = useContext(DialogStepperContext);

  if (!context) {
    throw new Error("DialogStepper components must be used within DialogStepper");
  }

  return context;
}

type DialogStepperProps = Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  children: React.ReactNode;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  step?: number;
  steps: number;
};

function DialogStepper({
  children,
  defaultStep = 0,
  onOpenChange,
  onStepChange,
  open,
  step,
  steps,
  ...props
}: DialogStepperProps) {
  const normalizedSteps = normalizeSteps(steps);
  const normalizedDefaultStep = normalizeStep(defaultStep, normalizedSteps);
  const [selectedStep, setSelectedStep] = useControllableState({
    defaultProp: normalizedDefaultStep,
    onChange: onStepChange,
    prop: step,
  });
  const activeStep = normalizeStep(selectedStep, normalizedSteps);

  useEffect(() => {
    const shouldWarnAboutInvalidStep = step !== undefined && step !== activeStep;
    if (shouldWarnAboutInvalidStep) {
      console.warn(
        `DialogStepper received an invalid step (${step}). Expected an integer between 0 and ${normalizedSteps - 1}.`
      );
    }
  }, [normalizedSteps, step]);

  const goToStep = useCallback(
    (nextStep: number) => {
      if (Number.isInteger(nextStep) && nextStep >= 0 && nextStep < normalizedSteps) {
        setSelectedStep(nextStep);
      }
    },
    [normalizedSteps, setSelectedStep]
  );

  const next = useCallback(() => {
    goToStep(activeStep + 1);
  }, [activeStep, goToStep]);

  const previous = useCallback(() => {
    goToStep(activeStep - 1);
  }, [activeStep, goToStep]);

  const contextValue = useMemo(
    () => ({ activeStep, goToStep, next, previous, steps: normalizedSteps }),
    [activeStep, goToStep, next, normalizedSteps, previous]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...props}>
      <DialogStepperContext value={contextValue}>{children}</DialogStepperContext>
    </Dialog>
  );
}

function DialogStepperTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props} />;
}

type DialogStepperContentProps = React.ComponentProps<typeof DialogContent>;

function DialogStepperContent({ className, onEscapeKeyDown, ...props }: DialogStepperContentProps) {
  const { activeStep, previous } = useDialogStepper();

  function handleEscapeKeyDown(event: KeyboardEvent) {
    onEscapeKeyDown?.(event);

    if (event.defaultPrevented || activeStep === 0) {
      return;
    }

    event.preventDefault();
    previous();
  }

  return (
    <DialogContent className={cn("overflow-hidden", className)} onEscapeKeyDown={handleEscapeKeyDown} {...props} />
  );
}

type DialogStepperStepProps = React.ComponentProps<"div"> & {
  index: number;
};

function DialogStepperStep({ children, className, index, ...props }: DialogStepperStepProps) {
  const { activeStep, steps } = useDialogStepper();

  if (!Number.isInteger(index) || index < 0 || index >= steps || activeStep !== index) {
    return null;
  }

  return (
    <div className={cn("w-full", className)} data-slot="dialog-stepper-step" {...props}>
      {children}
    </div>
  );
}

function DialogStepperNext({
  children,
  disabled,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { activeStep, next, steps } = useDialogStepper();
  const isLastStep = activeStep >= steps - 1;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      next();
    }
  };

  return (
    <Button
      data-slot="dialog-stepper-next"
      disabled={disabled || isLastStep}
      onClick={handleClick}
      {...props}
    >
      {children ?? "Next"}
    </Button>
  );
}

function DialogStepperPrevious({
  children,
  disabled,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { activeStep, previous } = useDialogStepper();
  const isFirstStep = activeStep === 0;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      previous();
    }
  };

  return (
    <Button
      data-slot="dialog-stepper-previous"
      disabled={disabled || isFirstStep}
      onClick={handleClick}
      {...props}
    >
      {children ?? "Previous"}
    </Button>
  );
}

function DialogStepperHeader(props: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader data-slot="dialog-stepper-header" {...props} />;
}

function DialogStepperTitle(props: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle data-slot="dialog-stepper-title" {...props} />;
}

function DialogStepperDescription(props: React.ComponentProps<typeof DialogDescription>) {
  return <DialogDescription data-slot="dialog-stepper-description" {...props} />;
}

function DialogStepperFooter(props: React.ComponentProps<typeof DialogFooter>) {
  return <DialogFooter data-slot="dialog-stepper-footer" {...props} />;
}

export {
  DialogStepper,
  DialogStepperContent,
  DialogStepperDescription,
  DialogStepperFooter,
  DialogStepperHeader,
  DialogStepperNext,
  DialogStepperPrevious,
  DialogStepperStep,
  DialogStepperTitle,
  DialogStepperTrigger,
  useDialogStepper,
};
