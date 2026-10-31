"use client";

/**
 * Admin UI kit: small, accessible primitives in the shadcn/ui style (Radix underneath).
 * Visual language: neutral zinc surfaces, brand green for primary actions, 8px radius.
 */
import { forwardRef, useId, useState, type ComponentProps, type ReactNode } from "react";
import { Dialog as RDialog, DropdownMenu as RDropdown, Switch as RSwitch, Tooltip as RTooltip } from "radix-ui";
import type { VariantProps } from "class-variance-authority";
import { badgeVariants, buttonVariants, cn, effectiveStatus, STATUS_LABELS, STATUS_TONES } from "./ui-shared";

export { badgeVariants, buttonVariants, cn, effectiveStatus, STATUS_LABELS, STATUS_TONES };
import { Eye, EyeOff, Loader2, X } from "lucide-react";


// ───────── Button ─────────


export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { loading?: boolean };
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
});

// ───────── Form controls ─────────

const control =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-500 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:bg-zinc-50 disabled:text-zinc-500 aria-[invalid=true]:border-red-500";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(control, "h-9", className)} {...props} />;
});
/**
 * Password field with a show/hide toggle. The eye button is a real button (keyboard and
 * screen-reader friendly) and never submits the form.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<ComponentProps<"input">, "type">>(function PasswordInput(
  { className, id, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  return (
    <div className="relative">
      <input ref={ref} id={inputId} type={visible ? "text" : "password"} className={cn(control, "h-9 pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={inputId}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-zinc-500 transition-colors hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
});
export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(control, "min-h-[84px] py-2 leading-relaxed", className)} {...props} />;
});
export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(control, "h-9 pr-8", className)} {...props} />;
});

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-[13px] font-medium text-zinc-700", className)} {...props} />;
}

/** Label + control + hint/error, wired up for accessibility. */
export function Field({
  label, hint, error, children, className, required,
}: {
  label: ReactNode; hint?: ReactNode; error?: string; required?: boolean; className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-err`} className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Switch({ checked, onCheckedChange, label, id, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; label?: ReactNode; id?: string; disabled?: boolean }) {
  const auto = useId();
  const sid = id ?? auto;
  return (
    <span className="inline-flex items-center gap-2.5">
      <RSwitch.Root
        id={sid}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="relative h-5 w-9 shrink-0 rounded-full bg-zinc-300 transition-colors data-[state=checked]:bg-brand disabled:opacity-50"
      >
        <RSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
      </RSwitch.Root>
      {label && <label htmlFor={sid} className="text-sm text-zinc-700">{label}</label>}
    </span>
  );
}

// ───────── Surfaces ─────────

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)} {...props} />;
}
export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4", className)}>
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone, className, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back}
        <h1 className="truncate text-[22px] font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 [&_svg]:size-5">{icon}</div>}
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ───────── Table ─────────

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}
export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-left text-xs font-medium text-zinc-500", className)} {...props} />;
}
export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-zinc-100 px-4 py-3 align-middle text-zinc-700", className)} {...props} />;
}

// ───────── Dialog ─────────

export function Dialog({
  open, onOpenChange, title, description, children, footer, size = "md",
}: {
  open: boolean; onOpenChange: (v: boolean) => void; title: ReactNode; description?: ReactNode;
  children?: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl";
}) {
  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-6xl" }[size];
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-[1px] data-[state=open]:animate-in" />
        <RDialog.Content
          className={cn("fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-white shadow-2xl outline-none", width)}
        >
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
            <div>
              <RDialog.Title className="text-base font-semibold text-zinc-900">{title}</RDialog.Title>
              {description ? (
                <RDialog.Description className="mt-0.5 text-[13px] text-zinc-500">{description}</RDialog.Description>
              ) : (
                <RDialog.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</RDialog.Description>
              )}
            </div>
            <RDialog.Close className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Close">
              <X className="size-4" />
            </RDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">{footer}</div>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = "Confirm", destructive, onConfirm, loading,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: ReactNode;
  confirmLabel?: string; destructive?: boolean; onConfirm: () => void; loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <div className="text-sm text-zinc-600">{description}</div>}
    </Dialog>
  );
}

// ───────── Dropdown ─────────

export const DropdownMenu = RDropdown.Root;
export const DropdownTrigger = RDropdown.Trigger;
export function DropdownContent({ className, align = "end", ...props }: ComponentProps<typeof RDropdown.Content>) {
  return (
    <RDropdown.Portal>
      <RDropdown.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-[180px] rounded-lg border border-zinc-200 bg-white p-1 shadow-lg", className)}
        {...props}
      />
    </RDropdown.Portal>
  );
}
export function DropdownItem({ className, destructive, ...props }: ComponentProps<typeof RDropdown.Item> & { destructive?: boolean }) {
  return (
    <RDropdown.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-zinc-100 data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-zinc-500",
        destructive ? "text-red-600 data-[highlighted]:bg-red-50 [&_svg]:text-red-500" : "text-zinc-700",
        className,
      )}
      {...props}
    />
  );
}
export const DropdownSeparator = () => <RDropdown.Separator className="my-1 h-px bg-zinc-100" />;

// ───────── Tooltip ─────────

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={300}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content sideOffset={6} className="z-50 rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow">
            {content}
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}

// ───────── Misc ─────────

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin text-zinc-500", className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500">{children}</kbd>;
}



export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{STATUS_LABELS[status] ?? status}</Badge>;
}
