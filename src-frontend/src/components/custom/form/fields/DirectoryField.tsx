import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { FORM_NAMESPACE } from "@/i18n/resources";
import {
  LazyFileTree,
  type FileTreeNode,
} from "@/components/custom/LazyFileTree";
import { FieldItem } from "@/components/custom/item/FieldItem";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listDirectories, useListDirectoriesSuspense } from "@/api/filesystem";
import { isTauri } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import type { FieldProps } from ".";
import { AsyncBoundary } from "../../AsyncBoundary";

type FileTreeSuspenseProps = {
  selectedPath?: string;
  onSelect: (path: string) => void;
};

function FileTreeSuspense({
  selectedPath: selected,
  onSelect,
}: FileTreeSuspenseProps) {
  const { data: rootItems } = useListDirectoriesSuspense({ path: "" });
  return (
    <LazyFileTree
      className="border-none p-0"
      rootNodes={rootItems.items as FileTreeNode[]}
      onSelect={onSelect}
      selectedPath={selected}
      loadChildren={async (path) => {
        const result = await listDirectories({ path });
        return result.items as FileTreeNode[];
      }}
    />
  );
}

type DirectorySelectDialogProps = {
  selectedPath?: string;
  onSelect: (path: string) => void;
  children: ReactNode;
};

function DirectorySelectDialog({
  selectedPath: selected,
  onSelect,
  children,
}: DirectorySelectDialogProps) {
  const { t } = useTranslation(FORM_NAMESPACE);
  const [open, setOpen] = useState(false);
  const [draftPath, setDraftPath] = useState(selected ?? "");

  const confirmSelection = () => {
    if (!draftPath) {
      return;
    }
    onSelect(draftPath);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("fields.directory.dialog.title")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-80 rounded-md border">
          <div className="p-2">
            <AsyncBoundary
              skeleton={
                <div className="px-2 py-1 text-muted-foreground text-sm">
                  {t("fields.directory.dialog.loading")}
                </div>
              }
            >
              <FileTreeSuspense
                selectedPath={draftPath}
                onSelect={(path) => {
                  console.log(path);
                  setDraftPath(path);
                }}
              />
            </AsyncBoundary>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            {t("fields.directory.dialog.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!draftPath}
            onClick={confirmSelection}
          >
            {t("fields.directory.dialog.select")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DirectoryFieldProps = FieldProps<typeof Input & { required?: boolean }>;

export function DirectoryField({
  fieldName = "directory",
  fieldProps,
  controlProps,
}: DirectoryFieldProps) {
  const { t } = useTranslation(FORM_NAMESPACE);
  const { register, getFieldState, formState, setValue, watch } =
    useFormContext();
  const fieldValue = watch(fieldName);
  const {
    className: controlClassName,
    required = true,
    placeholder = t("fields.directory.placeholder"),
    ...restControlProps
  } = controlProps ?? {};

  function setDirectoryValue(selected: string) {
    setValue(fieldName, selected, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  async function chooseDirectory() {
    if (!isTauri) {
      return;
    }

    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true });
      if (typeof selected === "string") {
        setDirectoryValue(selected);
      }
    } catch {
      toast.error(t("fields.directory.choose_error"));
    }
  }

  const chooseButton = (
    <Button
      type="button"
      variant="outline"
      onClick={isTauri ? chooseDirectory : undefined}
    >
      {t("fields.directory.choose_button")}
    </Button>
  );

  return (
    <FieldItem
      {...fieldProps}
      label={t("fields.directory.label")}
      fieldState={getFieldState(fieldName, formState)}
    >
      <div className="flex gap-2 w-full">
        <Input
          {...register(fieldName, {
            required: required
              ? t("fields.directory.validation.required")
              : false,
          })}
          placeholder={placeholder}
          className={cn("flex-1", controlClassName)}
          {...restControlProps}
        />
        {isTauri ? (
          chooseButton
        ) : (
          <DirectorySelectDialog
            selectedPath={fieldValue}
            onSelect={setDirectoryValue}
          >
            {chooseButton}
          </DirectorySelectDialog>
        )}
      </div>
    </FieldItem>
  );
}
