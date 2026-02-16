import { RefreshCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";

type FailedToLoadProps = {
  refetch: () => void;
  description: string;
};

export function FailedToLoad({ refetch, description }: FailedToLoadProps) {
  return (
    <Empty>
      <EmptyContent>
        <EmptyTitle>加载失败</EmptyTitle>
        <EmptyDescription>
          <div>{description}</div>
        </EmptyDescription>
        <EmptyContent>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCcwIcon />
            重试
          </Button>
        </EmptyContent>
      </EmptyContent>
    </Empty>
  );
}
