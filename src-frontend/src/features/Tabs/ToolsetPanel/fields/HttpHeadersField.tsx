import { Controller, useFormContext } from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Textarea } from "@/components/ui/textarea";

export function HttpHeadersField() {
  const { control } = useFormContext();

  return (
    <Controller
      name="params.http_headers"
      control={control}
      rules={{
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
      }}
      render={({ field, fieldState }) => (
        <FieldItem
          label="HTTP Headers"
          description="JSON 格式的请求头"
          fieldState={fieldState}
          orientation="vertical"
          align="start"
        >
          <Textarea
            {...field}
            placeholder='{"Authorization": "Bearer token"}'
            rows={6}
          />
        </FieldItem>
      )}
    />
  );
}
