import { Message, MessageActions, MessageContent } from "@/components/ai-elements/message";
import { Markdown } from "@/components/custom/Markdown";
import { CopyButton } from "@/components/ui/copy-button";

type TextMessageProps = {
  text: string | null;
  from: "user" | "assistant";
  isStreaming: boolean;
};

function normalizeText(text: string, from: "user" | "assistant") {
  let _text = text.trim();
  if (from === "user") {
    _text = _text.replace("\n", "<br>");
  }
  return _text;
}

export function TextMessage({ text, from, isStreaming }: TextMessageProps) {
  if (text === null || text.trim() === "") {
    return null;
  }

  const messageText = text;

  return (
    <Message className="selectable-text" from={from}>
      <MessageContent>
        <Markdown
          mode={!isStreaming ? "static" : "streaming"}
          parseIncompleteMarkdown={isStreaming}
        >
          {normalizeText(messageText, from)}
        </Markdown>
      </MessageContent>

      {from === "user" && (
        <MessageActions className="justify-end">
          <CopyButton variant="ghost" size="icon-sm" content={messageText.trim()} />
        </MessageActions>
      )}
    </Message>
  );
}
