import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

type TextMessageProps = {
  text: string | null;
  from: "user" | "assistant";
};

export function TextMessage({ text, from }: TextMessageProps) {
  if (text === null || text.trim() === "") {
    return null;
  }
  return (
    <Message from={from}>
      <MessageContent>
        {from === "assistant" ? (
          <MessageResponse>{text}</MessageResponse>
        ) : (
          (text as string)
        )}
      </MessageContent>
    </Message>
  );
}
