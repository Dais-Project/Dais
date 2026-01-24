import { useEffect, useRef, useState } from "react";
import {
  type Control,
  Controller,
  useFieldArray,
  useFormContext,
} from "react-hook-form";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ToolFormValues, ToolsetEditFormValues } from "./form-types";

type ToolItemProps = {
  tool: ToolFormValues;
  index: number;
  control: Control<ToolsetEditFormValues>;
};

function ToolItem({ tool, index, control }: ToolItemProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (element) {
      setIsOverflowing(element.scrollWidth > element.clientWidth);
    }
  }, [tool.description]);

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{tool.name}</ItemTitle>
        <Tooltip open={isOverflowing ? true : undefined}>
          <TooltipTrigger asChild>
            <ItemDescription ref={textRef} className="text-wrap">
              {tool.description}
            </ItemDescription>
          </TooltipTrigger>
          <TooltipContent>
            <pre className="max-w-lg text-wrap">{tool.description}</pre>
          </TooltipContent>
        </Tooltip>
      </ItemContent>
      <ItemActions className="flex-col">
        <Controller
          name={`tools.${index}.is_enabled`}
          control={control}
          render={({ field: { value, onChange }, fieldState }) => (
            <FieldItem title="启用" fieldState={fieldState}>
              <Checkbox checked={value} onCheckedChange={onChange} />
            </FieldItem>
          )}
        />
        <Controller
          name={`tools.${index}.auto_approve`}
          control={control}
          render={({ field: { value, onChange }, fieldState }) => (
            <FieldItem title="自动批准" fieldState={fieldState}>
              <Checkbox checked={value} onCheckedChange={onChange} />
            </FieldItem>
          )}
        />
      </ItemActions>
    </Item>
  );
}

export function ToolList() {
  const { control } = useFormContext<ToolsetEditFormValues>();
  const { fields } = useFieldArray({
    control,
    name: "tools",
  });

  return (
    <FieldSet className="mt-3 gap-3">
      <FieldLabel>工具列表</FieldLabel>
      <FieldGroup className="gap-y-2">
        {fields.map((field, index) => (
          <ToolItem
            key={field.id}
            tool={field}
            index={index}
            control={control}
          />
          // <div
          //   key={field.id}
          //   className="rounded-lg border border-border bg-muted/30 p-4"
          // >
          //   <Controller
          //     name={`tools.${index}.is_enabled`}
          //     control={control}
          //     render={({ field: { value, onChange }, fieldState }) => (
          //       <FieldItem title="启用" fieldState={fieldState}>
          //         <Switch checked={value} onCheckedChange={onChange} />
          //       </FieldItem>
          //     )}
          //   />
          //   <Controller
          //     name={`tools.${index}.auto_approve`}
          //     control={control}
          //     render={({ field: { value, onChange }, fieldState }) => (
          //       <FieldItem title="自动批准" fieldState={fieldState}>
          //         <Switch checked={value} onCheckedChange={onChange} />
          //       </FieldItem>
          //     )}
          //   />
          // </div>
        ))}
      </FieldGroup>
    </FieldSet>
  );
}
