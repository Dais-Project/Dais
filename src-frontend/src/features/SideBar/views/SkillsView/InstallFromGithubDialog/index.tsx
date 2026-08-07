import { SiGithub as GitHubIcon } from "@icons-pack/react-simple-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ScannedSkillRead } from "@/api/generated/schemas";
import { Button } from "@/components/ui/button";
import {
  DialogStepper,
  DialogStepperContent,
  DialogStepperStep,
  DialogStepperTrigger,
} from "@/components/ui/dialog-stepper";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { InstallFromGithubStep1 } from "./InstallFromGithubStep1";
import { InstallFromGithubStep2 } from "./InstallFromGithubStep2";

export function InstallFromGithubDialog() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [repoUrl, setRepoUrl] = useState("");
  const [scannedSkills, setScannedSkills] = useState<ScannedSkillRead[]>([]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(0);
      setRepoUrl("");
      setScannedSkills([]);
    }
    setOpen(nextOpen);
  };

  const handleNext = (nextRepoUrl: string, nextScannedSkills: ScannedSkillRead[]) => {
    setRepoUrl(nextRepoUrl);
    setScannedSkills(nextScannedSkills);
    setStep(1);
  };

  return (
    <DialogStepper steps={2} open={open} onOpenChange={handleOpenChange} step={step} onStepChange={setStep}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogStepperTrigger asChild>
            <Button variant="ghost" size="icon" type="button">
              <GitHubIcon className="size-4" />
            </Button>
          </DialogStepperTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("skills.header.install_github_tooltip")}</TooltipContent>
      </Tooltip>

      <DialogStepperContent className="max-w-lg">
        <DialogStepperStep index={0}>
          <InstallFromGithubStep1 onNext={handleNext} />
        </DialogStepperStep>

        <DialogStepperStep index={1}>
          <InstallFromGithubStep2
            repoUrl={repoUrl}
            scannedSkills={scannedSkills}
            onSuccess={() => handleOpenChange(false)}
          />
        </DialogStepperStep>
      </DialogStepperContent>
    </DialogStepper>
  );
}
