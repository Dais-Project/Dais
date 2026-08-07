import { useState } from "react";
import { useTranslation } from "react-i18next";
import isURL from "validator/lib/isURL";
import type { ScannedSkillRead } from "@/api/generated/schemas";
import { useScanRepoSkills } from "@/api/skill";
import { Button } from "@/components/ui/button";
import {
  DialogStepperDescription,
  DialogStepperFooter,
  DialogStepperHeader,
  DialogStepperTitle,
} from "@/components/ui/dialog-stepper";
import { Input } from "@/components/ui/input";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";

function isValidGithubRepoUrl(value: string): boolean {
  if (!isURL(value, { protocols: ["http", "https"], require_protocol: true })) {
    return false;
  }

  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") {
      return false;
    }
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.length >= 2;
  } catch {
    return false;
  }
}

type InstallFromGithubStep1Props = {
  onNext: (repoUrl: string, skills: ScannedSkillRead[]) => void;
};

export function InstallFromGithubStep1({ onNext }: InstallFromGithubStep1Props) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const scanMutation = useScanRepoSkills();
  const [repoUrl, setRepoUrl] = useState("");
  const canScan = isValidGithubRepoUrl(repoUrl.trim()) && !scanMutation.isPending;

  const handleScan = async () => {
    if (!canScan) return;
    const trimmedUrl = repoUrl.trim();
    const scanResult = await scanMutation.mutateAsync({
      data: { repo_url: trimmedUrl },
    });
    onNext(trimmedUrl, scanResult);
  };

  return (
    <>
      <DialogStepperHeader>
        <DialogStepperTitle>{t("skills.dialog.install_github.step1_title")}</DialogStepperTitle>
        <DialogStepperDescription>{t("skills.dialog.install_github.step1_description")}</DialogStepperDescription>
      </DialogStepperHeader>

      <Input
        id="github-repo-url"
        value={repoUrl}
        className="mt-4"
        onChange={(event) => setRepoUrl(event.target.value)}
        placeholder={t("skills.dialog.install_github.repo_url_placeholder")}
        disabled={scanMutation.isPending}
        onKeyDown={(event) => {
          if (event.key === "Enter" && canScan) {
            event.preventDefault();
            handleScan();
          }
        }}
      />

      <DialogStepperFooter className="mt-4">
        <Button disabled={!canScan} onClick={handleScan}>
          {scanMutation.isPending
            ? t("skills.dialog.install_github.scanning")
            : t("skills.dialog.install_github.scan")}
        </Button>
      </DialogStepperFooter>
    </>
  );
}
