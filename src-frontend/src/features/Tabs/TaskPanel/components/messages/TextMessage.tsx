import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";

type TextMessageProps = {
  text: string | null;
  from: "user" | "assistant";
};

function normalizeText(text: string, from: "user" | "assistant") {
  let _text = text.trim();
  if (from === "user") {
    _text = _text.replace("\n", "<br>");
  }
  return _text;
}

export function TextMessage({ text, from }: TextMessageProps) {
  if (text === null || text.trim() === "") {
    return null;
  }
  return (
    <Message className="selectable-text" from={from}>
      <MessageContent>
        <MessageResponse
          mode={from === "user" ? "static" : "streaming"}
          parseIncompleteMarkdown={from !== "user"}
        >
          {normalizeText(text, from)}
        </MessageResponse>
      </MessageContent>
    </Message>
  );
}
