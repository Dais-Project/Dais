import { cn } from "@/lib/utils";

type MiddleEllipsisProps = {
  children: string;
} & React.ComponentProps<"div">;

export function MiddleEllipsis({ children: text, className, ...props }: MiddleEllipsisProps) {
  const middle = Math.ceil(text.length / 2);
  const head = text.slice(0, middle);
  const tail = text.slice(middle);
  return (
    <div className={cn("flex min-w-0", className)} {...props}>
      <div className="flex-1 min-w-0 truncate">{head}</div>
      <bdi className="flex-1 min-w-0 truncate text-left" style={{
        direction: "rtl",
      }}>{tail}</bdi>
    </div>
  )
}
