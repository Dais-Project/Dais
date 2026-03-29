import { createTwoFilesPatch } from "diff";
import { CodeBlock } from "../ai-elements/code-block";

type DiffViewProps = Omit<React.ComponentProps<typeof CodeBlock>, "code" | "language"> & ({
  filename: string;
  oldText: string;
  newText: string;
} | {
  diffText: string;
});

export function DiffView({
  ...props
}: DiffViewProps) {
  let diffText: string;
  if ("diffText" in props) {
    diffText = props.diffText;
  } else if ("filename" in props && "oldText" in props && "newText" in props) {
    diffText = createTwoFilesPatch(
      props.filename,
      props.filename,
      props.oldText,
      props.newText,
    );
  } else {
    throw new Error("Invalid props for DiffView, must provide either diffText or filename, oldText and newText");
  }
  return (
    <CodeBlock code={diffText} language="diff" />
  )
}
