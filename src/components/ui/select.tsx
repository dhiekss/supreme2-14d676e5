"use client";

/**
 * Drop-in replacement for the shadcn/Radix `Select` API that adds a
 * searchable filter input to every dropdown across the app.
 *
 * The public API mirrors the original components (`Select`, `SelectTrigger`,
 * `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`,
 * `SelectSeparator`) so no call site changes are required. Under the hood it
 * is built with `Popover` + `Command` (cmdk) to get built-in filtering.
 */

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type SelectCtxValue = {
  value?: string;
  onValueChange: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  disabled?: boolean;
  labels: Map<string, React.ReactNode>;
  register: (v: string, label: React.ReactNode) => void;
  unregister: (v: string) => void;
};

const SelectCtx = React.createContext<SelectCtxValue | null>(null);
const useSel = () => {
  const ctx = React.useContext(SelectCtx);
  if (!ctx) throw new Error("Select subcomponents must be used inside <Select>");
  return ctx;
};

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  children?: React.ReactNode;
  /** Accepted for API compatibility (unused). */
  name?: string;
  required?: boolean;
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  disabled,
  open: openProp,
  onOpenChange,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string | undefined>(
    defaultValue,
  );
  const isValueControlled = value !== undefined;
  const currentValue = isValueControlled ? value : uncontrolledValue;

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isOpenControlled = openProp !== undefined;
  const open = isOpenControlled ? !!openProp : uncontrolledOpen;

  const setOpen = React.useCallback(
    (o: boolean) => {
      if (!isOpenControlled) setUncontrolledOpen(o);
      onOpenChange?.(o);
    },
    [isOpenControlled, onOpenChange],
  );

  const handleChange = React.useCallback(
    (v: string) => {
      if (!isValueControlled) setUncontrolledValue(v);
      onValueChange?.(v);
    },
    [isValueControlled, onValueChange],
  );

  const [labels, setLabels] = React.useState<Map<string, React.ReactNode>>(new Map());
  const register = React.useCallback((v: string, label: React.ReactNode) => {
    setLabels((prev) => {
      if (prev.get(v) === label) return prev;
      const next = new Map(prev);
      next.set(v, label);
      return next;
    });
  }, []);
  const unregister = React.useCallback((v: string) => {
    setLabels((prev) => {
      if (!prev.has(v)) return prev;
      const next = new Map(prev);
      next.delete(v);
      return next;
    });
  }, []);

  const ctx = React.useMemo<SelectCtxValue>(
    () => ({
      value: currentValue,
      onValueChange: handleChange,
      open,
      setOpen,
      disabled,
      labels,
      register,
      unregister,
    }),
    [currentValue, handleChange, open, setOpen, disabled, labels, register, unregister],
  );

  return (
    <SelectCtx.Provider value={ctx}>
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </SelectCtx.Provider>
  );
}

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, disabled, ...props }, ref) => {
  const { disabled: ctxDisabled, value } = useSel();
  return (
    <PopoverTrigger asChild>
      <button
        ref={ref}
        type="button"
        role="combobox"
        disabled={disabled || ctxDisabled}
        data-placeholder={value == null || value === "" ? "" : undefined}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
      </button>
    </PopoverTrigger>
  );
});
SelectTrigger.displayName = "SelectTrigger";

export interface SelectValueProps {
  placeholder?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function SelectValue({ placeholder, className, children }: SelectValueProps) {
  const { value, labels } = useSel();
  const label =
    value !== undefined && value !== "" ? labels.get(value) ?? children : undefined;
  const isEmpty = label === undefined || label === null || label === "";
  return (
    <span
      className={cn(
        "truncate text-left flex-1",
        isEmpty && "text-muted-foreground",
        className,
      )}
    >
      {isEmpty ? placeholder : label}
    </span>
  );
}

export interface SelectContentProps {
  children?: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  position?: "popper" | "item-aligned";
  /** Optional custom placeholder for the search input. */
  searchPlaceholder?: string;
  /** Text shown when no options match the search. */
  emptyText?: string;
  /** Hide the search field for very short lists. */
  hideSearch?: boolean;
}

export function SelectContent({
  children,
  className,
  align = "start",
  side,
  sideOffset = 4,
  searchPlaceholder = "Cari…",
  emptyText = "Tidak ada hasil",
  hideSearch = false,
}: SelectContentProps) {
  return (
    <PopoverContent
      align={align}
      side={side}
      sideOffset={sideOffset}
      className={cn(
        "p-0 w-[var(--radix-popover-trigger-width)] min-w-[8rem]",
        className,
      )}
      onOpenAutoFocus={(e) => {
        // let CommandInput autofocus itself
        if (hideSearch) e.preventDefault();
      }}
    >
      <Command
        filter={(itemValue, search) => {
          if (!search) return 1;
          return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
        }}
      >
        {!hideSearch && <CommandInput placeholder={searchPlaceholder} className="h-9" />}
        <CommandList className="max-h-72">
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup>{children}</CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  );
}

function collectText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (React.isValidElement(node)) {
    const child = (node.props as { children?: React.ReactNode }).children;
    return collectText(child);
  }
  return "";
}

export interface SelectItemProps {
  value: string;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  /** Extra strings to include in the search index. */
  keywords?: string[];
  /** Explicit label to show in the trigger; falls back to children. */
  textValue?: string;
}

export function SelectItem({
  value,
  children,
  disabled,
  className,
  keywords,
  textValue,
}: SelectItemProps) {
  const ctx = useSel();
  const label: React.ReactNode = textValue ?? children;

  React.useEffect(() => {
    ctx.register(value, label);
    return () => ctx.unregister(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, textValue, typeof children === "string" ? children : undefined]);

  const searchIndex = React.useMemo(() => {
    const parts = [collectText(children), value];
    if (textValue) parts.push(textValue);
    if (keywords?.length) parts.push(...keywords);
    return parts.filter(Boolean).join(" ");
  }, [children, value, textValue, keywords]);

  const selected = ctx.value === value;

  return (
    <CommandItem
      value={searchIndex || value}
      disabled={disabled}
      onSelect={() => {
        if (disabled) return;
        ctx.onValueChange(value);
        ctx.setOpen(false);
      }}
      className={cn(
        "cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground",
        selected && "font-medium",
        className,
      )}
    >
      <Check
        className={cn("mr-2 h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")}
      />
      <span className="flex-1 truncate">{children}</span>
    </CommandItem>
  );
}

export function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function SelectLabel({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)}
    >
      {children}
    </div>
  );
}

export function SelectSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />;
}

// Kept for API compatibility with Radix's scroll button exports.
export const SelectScrollUpButton: React.FC<React.HTMLAttributes<HTMLDivElement>> = () => null;
export const SelectScrollDownButton: React.FC<React.HTMLAttributes<HTMLDivElement>> = () => null;
