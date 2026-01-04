import "./styles/index.css";

import type { Content, Editor } from "@tiptap/react";
import { EditorContent, EditorContext } from "@tiptap/react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MeasuredContainer } from "./components/measured-container";
import { LinkBubbleMenu } from "./components/menu/link-bubble-menu";
import { TableContextMenu } from "./components/menu/table-context-menu";
import { SectionFive } from "./components/section/five";
import { SectionFour } from "./components/section/four";
import { SectionOne } from "./components/section/one";
import { SectionTwo } from "./components/section/two";
import type { UseMinimalTiptapEditorProps } from "./hooks/use-minimal-tiptap";
import { useMinimalTiptapEditor } from "./hooks/use-minimal-tiptap";
import { useTiptapEditor } from "./hooks/use-tiptap-editor";

export interface MinimalTiptapProps
  extends Omit<UseMinimalTiptapEditorProps, "onUpdate"> {
  value?: Content;
  onChange?: (value: Content) => void;
  className?: string;
  editorContentClassName?: string;
}

const Toolbar = ({ editor }: { editor: Editor }) => (
  <div className="flex h-12 shrink-0 overflow-hidden border-border border-b p-2">
    <div className="flex w-max items-center gap-px">
      <SectionOne editor={editor} activeLevels={[1, 2, 3, 4, 5, 6]} />

      <Separator orientation="vertical" className="mx-2" />

      <SectionTwo
        editor={editor}
        activeActions={[
          "bold",
          "italic",
          "underline",
          "strikethrough",
          "code",
          "clearFormatting",
        ]}
        mainActionCount={3}
      />

      <Separator orientation="vertical" className="mx-2" />

      {/* <SectionThree editor={editor} />

      <Separator orientation="vertical" className="mx-2" /> */}

      <SectionFour
        editor={editor}
        activeActions={["orderedList", "bulletList"]}
        mainActionCount={0}
      />

      <Separator orientation="vertical" className="mx-2" />

      <SectionFive
        editor={editor}
        activeActions={["codeBlock", "blockquote", "horizontalRule", "table"]}
        mainActionCount={0}
      />
    </div>
  </div>
);

export const MinimalTiptapEditor = ({
  value,
  onChange,
  className,
  editorContentClassName,
  ...props
}: MinimalTiptapProps) => {
  const editor = useMinimalTiptapEditor({
    value,
    onUpdate: onChange,
    ...props,
  });

  if (!editor) {
    return null;
  }

  return (
    <EditorContext.Provider value={{ editor }}>
      <MainMinimalTiptapEditor
        editor={editor}
        className={className}
        editorContentClassName={editorContentClassName}
      />
    </EditorContext.Provider>
  );
};

MinimalTiptapEditor.displayName = "MinimalTiptapEditor";

export default MinimalTiptapEditor;

export const MainMinimalTiptapEditor = ({
  editor: providedEditor,
  className,
  editorContentClassName,
}: MinimalTiptapProps & { editor: Editor }) => {
  const { editor } = useTiptapEditor(providedEditor);

  if (!editor) {
    return null;
  }

  return (
    <MeasuredContainer
      as="div"
      name="editor"
      style={{
        contain: "layout paint style",
      }}
      className={cn(
        "bg-transparent transition-[color,box-shadow] placeholder:text-muted-foreground dark:bg-input/30",
        "flex h-auto w-full flex-col rounded-md border border-input shadow-xs min-data-[orientation=vertical]:h-72",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
    >
      <Toolbar editor={editor} />
      <TableContextMenu editor={editor}>
        <EditorContent
          editor={editor}
          className={cn(
            "minimal-tiptap-editor px-3 py-2",
            editorContentClassName
          )}
        />
      </TableContextMenu>
      <LinkBubbleMenu editor={editor} />
    </MeasuredContainer>
  );
};
