import { Message, MessageContent } from "@/components/ai-elements/message";
import { Markdown } from "@/components/custom/Markdown";

type AssistantMessageProps = {
  text: string | null;
  isStreaming: boolean;
};

export function AssistantMessage({ text, isStreaming }: AssistantMessageProps) {
  return (
    <Message className="selectable" from="assistant">
      <MessageContent>
        <Markdown
          mode={!isStreaming ? "static" : "streaming"}
          parseIncompleteMarkdown={isStreaming}
        >
          {text?.trim() ?? ""}
        </Markdown>
      </MessageContent>
    </Message>
  );
}
