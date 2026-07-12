import { SiGithub as GitHubIcon } from '@icons-pack/react-simple-icons';
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import isURL from "validator/lib/isURL";
import type { ScannedSkillRead } from "@/api/generated/schemas";
import {
  invalidateSkillQueries,
  useInstallFromGithub,
  useScanRepoSkills,
} from "@/api/skill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogStack,
  DialogStackBody,
  DialogStackContent,
  DialogStackDescription,
  DialogStackFooter,
  DialogStackHeader,
  DialogStackNext,
  DialogStackOverlay,
  DialogStackPrevious,
  DialogStackTitle,
  DialogStackTrigger,
} from "@/components/ui/dialog-stack";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SIDEBAR_NAMESPACE } from "@/i18n/resources";
import { cn } from "@/lib/utils";

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

type InstallableSkillProps = {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  skill: {
    name: string;
    description: string;
    path: string;
  }
}

function InstallableSkill({ checked, onCheckedChange, skill }: InstallableSkillProps) {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);

  return (
    <div className={cn("flex cursor-pointer items-start gap-3 p-3 hover:bg-accent/50")}>
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="truncate font-medium text-sm">
          {skill.name}
        </div>
        <div className="line-clamp-2 text-muted-foreground text-xs">
          {skill.description ||
            t("skills.list.no_description")}
        </div>
      </div>
    </div>
  )
}

export function InstallFromGithubDialog() {
  const { t } = useTranslation(SIDEBAR_NAMESPACE);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(false);
  const scanRequestIdRef = useRef(0);
  const installRequestIdRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [stackKey, setStackKey] = useState(0);
  const [repoUrl, setRepoUrl] = useState("");
  const [scannedSkills, setScannedSkills] = useState<ScannedSkillRead[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    const wasOpen = openRef.current;
    openRef.current = nextOpen;
    setOpen(nextOpen);

    if (wasOpen && !nextOpen) {
      scanRequestIdRef.current += 1;
      installRequestIdRef.current += 1;
      setRepoUrl("");
      setScannedSkills([]);
      setSelectedPaths([]);
      setStackKey((key) => key + 1);
    }
  }, []);

  const scanMutation = useScanRepoSkills();
  const installMutation = useInstallFromGithub();

  const canScan =
    isValidGithubRepoUrl(repoUrl.trim()) && !scanMutation.isPending;
  const canInstall =
    selectedPaths.length > 0 &&
    !installMutation.isPending &&
    !scanMutation.isPending;

  const handleScan = () => {
    const trimmedUrl = repoUrl.trim();
    if (!isValidGithubRepoUrl(trimmedUrl) || scanMutation.isPending) {
      return;
    }

    const requestId = ++scanRequestIdRef.current;
    setScannedSkills([]);
    setSelectedPaths([]);

    scanMutation.mutate(
      { data: { repo_url: trimmedUrl } },
      {
        onSuccess(skills) {
          if (requestId !== scanRequestIdRef.current || !openRef.current) {
            return;
          }
          setScannedSkills(skills);
          setSelectedPaths([]);
          nextButtonRef.current?.click();
        },
      },
    );
  };

  const handleTogglePath = (path: string, checked: boolean) => {
    setSelectedPaths((prev) => {
      if (checked) {
        if (prev.includes(path)) {
          return prev;
        }
        return [...prev, path];
      }
      return prev.filter((item) => item !== path);
    });
  };

  const allSelected =
    scannedSkills.length > 0 &&
    selectedPaths.length === scannedSkills.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedPaths([]);
      return;
    }
    setSelectedPaths(scannedSkills.map((skill) => skill.path));
  };

  const handleInstall = () => {
    if (!canInstall) {
      return;
    }

    const requestId = ++installRequestIdRef.current;
    installMutation.mutate(
      {
        data: {
          repo_url: repoUrl.trim(),
          skill_paths: selectedPaths,
        },
      },
      {
        async onSuccess(skills) {
          if (requestId !== installRequestIdRef.current || !openRef.current) {
            return;
          }

          await invalidateSkillQueries();
          toast.success(t("skills.toast.install_github_success_title"), {
            description: t("skills.toast.install_github_success_description", {
              count: skills.length,
            }),
          });
          handleOpenChange(false);
        },
      },
    );
  };

  return (
    <DialogStack
      key={stackKey}
      open={open}
      onOpenChange={handleOpenChange}
      clickable
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogStackTrigger asChild>
            <Button variant="ghost" size="icon" type="button">
              <GitHubIcon className="size-4" />
            </Button>
          </DialogStackTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {t("skills.header.install_github_tooltip")}
        </TooltipContent>
      </Tooltip>

      <DialogStackOverlay />

      <DialogStackBody className="max-w-lg">
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>
              {t("skills.dialog.install_github.step1_title")}
            </DialogStackTitle>
            <DialogStackDescription>
              {t("skills.dialog.install_github.step1_description")}
            </DialogStackDescription>
          </DialogStackHeader>

          <Input
            id="github-repo-url"
            value={repoUrl}
            className="mt-4"
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder={t(
              "skills.dialog.install_github.repo_url_placeholder",
            )}
            disabled={scanMutation.isPending}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canScan) {
                event.preventDefault();
                handleScan();
              }
            }}
          />

          <DialogStackFooter>
            <Button type="button" disabled={!canScan} onClick={handleScan}>
              {scanMutation.isPending
                ? t("skills.dialog.install_github.scanning")
                : t("skills.dialog.install_github.scan")}
            </Button>
            <DialogStackNext asChild>
              <button
                ref={nextButtonRef}
                type="button"
                className="hidden"
                aria-hidden
                tabIndex={-1}
              />
            </DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>

        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>
              {t("skills.dialog.install_github.step2_title")}
            </DialogStackTitle>
          </DialogStackHeader>

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
                <div className="p-4 text-muted-foreground text-sm">
                  {t("skills.dialog.install_github.empty")}
                </div>
              ) : (
                <div className="divide-y">
                  {scannedSkills.map((skill) => {
                    const checked = selectedPaths.includes(skill.path);
                    return (
                      <InstallableSkill
                        key={skill.path}
                        checked={checked}
                        skill={skill}
                        onCheckedChange={() => handleTogglePath(skill.path, value === true)}
                      />
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogStackFooter>
            <DialogStackPrevious asChild>
              <Button type="button" variant="outline">
                {t("skills.dialog.install_github.back")}
              </Button>
            </DialogStackPrevious>
            <Button
              type="button"
              disabled={!canInstall}
              onClick={handleInstall}
            >
              {installMutation.isPending
                ? t("skills.dialog.install_github.installing")
                : t("skills.dialog.install_github.install")}
            </Button>
          </DialogStackFooter>
        </DialogStackContent>
      </DialogStackBody>
    </DialogStack>
  );
}
