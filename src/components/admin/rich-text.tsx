"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold, Heading2, Heading3, Heading4, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, RemoveFormatting, Underline, Undo2, Unlink,
} from "lucide-react";
import { MediaPickerDialog } from "./media-picker";
import { Button, Dialog, Input, cn } from "./ui";

/**
 * WYSIWYG editor producing clean HTML. The output is sanitized again on the server
 * (src/lib/sanitize.ts) before it is stored or rendered, so the allow-list is enforced there.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minimal,
  allowImages = true,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minimal?: boolean;
  allowImages?: boolean;
  className?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto", "tel"], HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
      Image.configure({ inline: false }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn("prose-site min-h-[140px] px-4 py-3 text-[15px] outline-none", minimal && "min-h-[80px]"),
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Keep in sync when the value is replaced from outside (e.g. restoring a revision).
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(editor.isEmpty && !value)) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-zinc-200 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15", className)}>
      {editor && <Toolbar editor={editor} minimal={minimal} allowImages={allowImages} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Item({ label, active = false, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn("flex size-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 [&_svg]:size-4", active && "bg-zinc-900 text-white hover:bg-zinc-800")}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, minimal, allowImages }: { editor: Editor; minimal?: boolean; allowImages: boolean }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const sep = <span className="mx-1 h-5 w-px bg-zinc-200" aria-hidden />;
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-100 bg-zinc-50/70 px-1.5 py-1" role="toolbar" aria-label="Formatting">
      {!minimal && (
        <>
          <Item label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></Item>
          <Item label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 /></Item>
          <Item label="Heading 4" active={editor.isActive("heading", { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}><Heading4 /></Item>
          {sep}
        </>
      )}
      <Item label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></Item>
      <Item label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></Item>
      <Item label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline /></Item>
      {sep}
      <Item label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></Item>
      <Item label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></Item>
      {!minimal && <Item label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote /></Item>}
      {!minimal && <Item label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus /></Item>}
      {sep}
      <Item label="Link" active={editor.isActive("link")} onClick={() => { setLinkUrl(editor.getAttributes("link").href ?? ""); setLinkOpen(true); }}><Link2 /></Item>
      {editor.isActive("link") && <Item label="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}><Unlink /></Item>}
      {allowImages && !minimal && <Item label="Insert image" onClick={() => setMediaOpen(true)}><ImagePlus /></Item>}
      <Item label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting /></Item>
      <span className="ml-auto flex">
        <Item label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 /></Item>
        <Item label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 /></Item>
      </span>

      <Dialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title="Insert link"
        size="sm"
        footer={
          <>
            <Button onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                const url = linkUrl.trim();
                if (!url) editor.chain().focus().unsetLink().run();
                else if (/^(https?:|mailto:|tel:|\/|#)/i.test(url) && !url.startsWith("//")) {
                  editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: /^https?:/i.test(url) ? "_blank" : null }).run();
                }
                setLinkOpen(false);
              }}
            >
              Apply
            </Button>
          </>
        }
      >
        <label className="text-[13px] font-medium text-zinc-700" htmlFor="rte-link">URL</label>
        <Input id="rte-link" className="mt-1.5" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/about/ or https://… or mailto:…" autoFocus />
        <p className="mt-1.5 text-xs text-zinc-500">Use a path such as /registration/ for pages on this site; external links open in a new tab.</p>
      </Dialog>
      <MediaPickerDialog
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onSelect={(items) => items.forEach((i) => editor.chain().focus().setImage({ src: i.url, alt: i.alt || "" }).run())}
      />
    </div>
  );
}
