import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ScannedSkillRead } from "@/api/generated/schemas";
import { invalidateSkillQueries, useInstallFromGithub } from "@/api/skill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogStepperFooter,
  DialogStepperHeader,
  DialogStepperPrevious,
  DialogStepperTitle,
} from "@/components/ui/dialog-stepper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";

type InstallableSkillProps = {
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (value: boolean) => void;
  skill: ScannedSkillRead;
};

function InstallableSkill({ checked, disabled, onCheckedChange, skill }: InstallableSkillProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  return (
    <div
      className={cn("flex cursor-pointer items-start gap-3 p-3 hover:bg-accent/50")}
      onClick={() => onCheckedChange(!checked)}
      role="button"
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        onClick={(event) => event.stopPropagation()}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="truncate font-medium text-sm">{skill.name}</div>
        <div className="line-clamp-2 text-muted-foreground text-xs">
          {skill.description || t("skills.list.no_description")}
        </div>
      </div>
    </div>
  );
}

type InstallFromGithubStep2Props = {
  repoUrl: string;
  scannedSkills: ScannedSkillRead[];
  onSuccess: () => void;
};

export function InstallFromGithubStep2({ repoUrl, scannedSkills, onSuccess }: InstallFromGithubStep2Props) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const installMutation = useInstallFromGithub();
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const allSelected = scannedSkills.length > 0 && selectedPaths.length === scannedSkills.length;
  const canInstall = selectedPaths.length > 0 && !installMutation.isPending;

  const handleTogglePath = (path: string, checked: boolean) => {
    setSelectedPaths((previousPaths) => {
      if (checked) {
        if (previousPaths.includes(path)) {
          return previousPaths;
        }
        return [...previousPaths, path];
      }
      return previousPaths.filter((item) => item !== path);
    });
  };

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedPaths([]);
      return;
    }
    setSelectedPaths(scannedSkills.map((skill) => skill.path));
  };

  const handleInstall = () => {
    if (!canInstall) return;

    installMutation.mutate({
      data: {
        repo_url: repoUrl,
        skill_paths: selectedPaths,
      },
    }, {
      async onSuccess(skills) {
        await invalidateSkillQueries();
        toast.success(t("skills.toast.install_github_success_title"), {
          description: t("skills.toast.install_github_success_description", {
            count: skills.length,
          }),
        });
        onSuccess();
      },
    });
  };

  return (
    <>
      <DialogStepperHeader>
        <DialogStepperTitle>{t("skills.dialog.install_github.step2_title")}</DialogStepperTitle>
      </DialogStepperHeader>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm">
            {t("skills.dialog.install_github.selected_count", {
              count: selectedPaths.length,
            })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleSelectAll}
            disabled={scannedSkills.length === 0}
          >
            {allSelected
              ? t("skills.dialog.install_github.deselect_all")
              : t("skills.dialog.install_github.select_all")}
          </Button>
        </div>

        <ScrollArea className="h-64 rounded-md border">
          {scannedSkills.length === 0 ? (
            <div className="p-4 text-muted-foreground text-sm">{t("skills.dialog.install_github.empty")}</div>
          ) : (
            <div className="divide-y">
              {scannedSkills.map((skill) => {
                const checked = selectedPaths.includes(skill.path);
                return (
                  <InstallableSkill
                    key={skill.path}
                    checked={checked}
                    skill={skill}
                    disabled={installMutation.isPending}
                    onCheckedChange={(nextChecked) => handleTogglePath(skill.path, nextChecked)}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <DialogStepperFooter className="mt-4">
        <DialogStepperPrevious variant="outline">
          {t("skills.dialog.install_github.back")}
        </DialogStepperPrevious>
        <Button disabled={!canInstall} onClick={handleInstall}>
          {installMutation.isPending
            ? t("skills.dialog.install_github.installing")
            : t("skills.dialog.install_github.install")}
        </Button>
      </DialogStepperFooter>
    </>
  );
}
