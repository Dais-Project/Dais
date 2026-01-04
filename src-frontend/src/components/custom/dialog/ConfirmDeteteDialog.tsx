import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConfirmDeleteDialogProps = {
  open?: boolean;
  children?: React.ReactNode;
  description: string;
  isDeleting?: boolean;
  onOpen?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export function ConfirmDeleteDialog({
  children,
  description,
  open,
  isDeleting = false,
  onOpen,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  const handleOpenChange = (open_: boolean) => {
    if (open_) {
      onOpen?.();
    } else if (!isDeleting) {
      onCancel?.();
    }
  };
  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isDeleting}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "删除中..." : "确认删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
