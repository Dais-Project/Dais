import { Message, MessageContent } from "@/components/ai-elements/message";
import { Markdown } from "@/components/custom/Markdown";

type AssistantMessageProps = {
  text: string | null;
  isStreaming: boolean;
};

export function AssistantMessage({ text, isStreaming }: AssistantMessageProps) {
  if (text === null || text.trim() === "") {
    return null;
  }

  return (
    <Message className="selectable-text" from="assistant">
      <MessageContent>
        <Markdown
          mode={!isStreaming ? "static" : "streaming"}
          parseIncompleteMarkdown={isStreaming}
        >
          {text.trim()}
        </Markdown>
      </MessageContent>
    </Message>
  );
}
