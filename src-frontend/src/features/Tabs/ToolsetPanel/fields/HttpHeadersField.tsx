import { useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Textarea } from "@/components/ui/textarea";

export function HttpHeadersField() {
  const { register, getFieldState } = useFormContext();

  return (
    <FieldItem
      label="HTTP Headers"
      description="JSON 格式的请求头"
      fieldState={getFieldState("params.http_headers")}
      orientation="vertical"
      align="start"
    >
      <Textarea
        {...register("params.http_headers", {
          validate: (value) => {
            if (!value || value.trim() === "") {
              return true;
            }
            try {
              JSON.parse(value);
              return true;
            } catch {
              return "请输入有效的 JSON 格式";
            }
          },
        })}
        placeholder='{"Authorization": "Bearer token"}'
        rows={6}
      />
    </FieldItem>
  );
}
