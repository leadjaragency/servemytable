"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Dark-theme CSS variable overrides ─────────────────────────────────────
   These are injected on every modal content root so every child element
   using ra-* Tailwind classes (inputs, labels, selects) auto-renders dark.
──────────────────────────────────────────────────────────────────────────── */
const DARK_VARS: React.CSSProperties = {
  ["--color-ra-bg" as string]:      "#131313",
  ["--color-ra-surface" as string]: "#1A1A1A",
  ["--color-ra-border" as string]:  "rgba(198,163,78,0.25)",
  ["--color-ra-text" as string]:    "#FAF6ED",
  ["--color-ra-muted" as string]:   "#AD897E",
  ["--color-ra-accent" as string]:  "#FF4D00",
};

/* ── Re-export primitives for composable use ───────────────────────────── */
export const ModalRoot      = Dialog.Root;
export const ModalTrigger   = Dialog.Trigger;
export const ModalClose     = Dialog.Close;
export const ModalPortal    = Dialog.Portal;

/* ── Overlay ────────────────────────────────────────────────────────────── */
function ModalOverlay({ className, ...props }: Dialog.DialogOverlayProps) {
  return (
    <Dialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        "data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-in",
        className
      )}
      {...props}
    />
  );
}

/* ── Content ────────────────────────────────────────────────────────────── */
interface ModalContentProps extends Dialog.DialogContentProps {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  hideClose?: boolean;
}

function ModalContent({
  className,
  children,
  size = "md",
  hideClose = false,
  ...props
}: ModalContentProps) {
  const sizeClasses = {
    sm:   "max-w-sm",
    md:   "max-w-lg",
    lg:   "max-w-2xl",
    xl:   "max-w-4xl",
    full: "max-w-[95vw]",
  };

  return (
    <ModalPortal>
      <ModalOverlay />
      <Dialog.Content
        style={DARK_VARS}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2",
          "rounded-2xl overflow-hidden",
          "border border-[rgba(198,163,78,0.2)]",
          "shadow-[0_32px_80px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(198,163,78,0.08)]",
          "focus:outline-none",
          "data-[state=open]:animate-bounce-in",
          "max-h-[90vh] overflow-y-auto",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <Dialog.Close
            className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-150 focus:outline-none"
          >
            <X size={16} />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        )}
      </Dialog.Content>
    </ModalPortal>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */
function ModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 pt-6 pb-4 border-b border-[rgba(198,163,78,0.15)]", className)}
      style={{ background: "linear-gradient(135deg, #1A1A1A 0%, #0E0E0E 100%)" }}
      {...props}
    />
  );
}

/* ── Title ──────────────────────────────────────────────────────────────── */
function ModalTitle({ className, ...props }: Dialog.DialogTitleProps) {
  return (
    <Dialog.Title
      className={cn(
        "font-display text-2xl font-bold text-[#FAF6ED] leading-tight pr-8 tracking-tight",
        className
      )}
      {...props}
    />
  );
}

/* ── Description ────────────────────────────────────────────────────────── */
function ModalDescription({ className, ...props }: Dialog.DialogDescriptionProps) {
  return (
    <Dialog.Description
      className={cn("mt-1.5 text-sm font-sans text-[#AD897E] leading-relaxed", className)}
      {...props}
    />
  );
}

/* ── Body ───────────────────────────────────────────────────────────────── */
function ModalBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 py-5 font-sans", className)}
      style={{ background: "#131313" }}
      {...props}
    />
  );
}

/* ── Footer ─────────────────────────────────────────────────────────────── */
function ModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 px-6 py-4",
        "border-t border-[rgba(198,163,78,0.15)]",
        className
      )}
      style={{ background: "#0E0E0E" }}
      {...props}
    />
  );
}

/* ── Convenience wrapper ─────────────────────────────────────────────────── */
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalContentProps["size"];
  contentClassName?: string;
}

function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size,
  contentClassName,
}: ModalProps) {
  return (
    <ModalRoot open={open} onOpenChange={onOpenChange}>
      <ModalContent size={size} className={contentClassName}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          {description && <ModalDescription>{description}</ModalDescription>}
        </ModalHeader>
        <ModalBody>{children}</ModalBody>
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContent>
    </ModalRoot>
  );
}

export {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
};
