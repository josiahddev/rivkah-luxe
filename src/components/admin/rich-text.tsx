"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { cn } from "@/lib/utils";

function ToolbarButton({ onClick, active, label, children }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn("min-w-9 rounded px-2 py-1.5 text-sm transition-colors", active ? "bg-ink text-ivory" : "text-charcoal hover:bg-sand")}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-line bg-cream/60 p-1.5">
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></ToolbarButton>
      <ToolbarButton label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
      <ToolbarButton label="Small heading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
      <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolbarButton>
      <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>“ ”</ToolbarButton>
      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={() => {
          if (editor.isActive("link")) return editor.chain().focus().unsetLink().run();
          const url = window.prompt("Link address (e.g. https://… or /shop)");
          if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        Link
      </ToolbarButton>
      <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>↺</ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>↻</ToolbarButton>
    </div>
  );
}

/** Rich text editor. The HTML goes into a hidden input and is cleaned on the server before saving. */
export function RichText({ name, defaultValue, label, hint, minHeight = 180 }: { name: string; defaultValue?: string | null; label?: string; hint?: string; minHeight?: number }) {
  const [html, setHtml] = useState(defaultValue ?? "");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } })],
    content: defaultValue ?? "",
    editorProps: { attributes: { class: "prose-luxe max-w-none px-4 py-3 focus:outline-none", style: `min-height:${minHeight}px` } },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });
  return (
    <div className="space-y-1.5">
      {label && <p className="text-[0.78rem] font-medium text-charcoal">{label}</p>}
      <input type="hidden" name={name} value={html} />
      <div className="overflow-hidden rounded-md border border-line bg-white focus-within:border-ink">
        {editor ? <Toolbar editor={editor} /> : <div className="h-11 border-b border-line bg-cream/60" />}
        <EditorContent editor={editor} />
      </div>
      {hint && <p className="text-xs text-stone">{hint}</p>}
    </div>
  );
}
