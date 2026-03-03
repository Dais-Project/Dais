import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
import { CheckIcon, CopyIcon } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CopyButtonProps = Omit<React.ComponentProps<'button'>, 'children'> &
  VariantProps<typeof buttonVariants> & {
    content: string;
    copied?: boolean;
    onCopiedChange?: (copied: boolean, content?: string) => void;
    delay?: number;
  };

function CopyButton({
  className,
  content,
  copied: copiedProp,
  onCopiedChange,
  onClick,
  variant = 'outline',
  size = 'icon',
  delay = 2000,
  ...props
}: CopyButtonProps) {
  const [isCopiedInternal, setIsCopiedInternal] = React.useState(false);

  const isControlled = copiedProp !== undefined;
  const isCopied = isControlled ? copiedProp : isCopiedInternal;

  const handleCopy = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (isCopied) return;

      if (content) {
        navigator.clipboard
          .writeText(content)
          .then(() => {
            if (!isControlled) setIsCopiedInternal(true);
            onCopiedChange?.(true, content);

            setTimeout(() => {
              if (!isControlled) setIsCopiedInternal(false);
              onCopiedChange?.(false);
            }, delay);
          })
          .catch((error) => {
            console.error('Error copying content:', error);
          });
      }
    },
    [onClick, isCopied, isControlled, content, onCopiedChange, delay],
  );

  return (
    <Button
      data-slot="copy-button"
      variant={variant}
      size={size}
      className={cn('cursor-pointer', className)}
      onClick={handleCopy}
      {...props}
    >
      <span className="relative flex items-center justify-center size-4">
        <CopyIcon
          className={cn(
            'absolute inset-0 transition-all duration-200',
            isCopied
              ? 'scale-0 opacity-0 blur-sm'
              : 'scale-100 opacity-100 blur-0',
          )}
        />
        <CheckIcon
          className={cn(
            'absolute inset-0 transition-all duration-200',
            isCopied
              ? 'scale-100 opacity-100 blur-0'
              : 'scale-0 opacity-0 blur-sm',
          )}
        />
      </span>
    </Button>
  );
}

export { CopyButton, type CopyButtonProps };
