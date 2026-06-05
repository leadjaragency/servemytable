"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { useId } from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** "indigo" (super-admin), "amber" (restaurant-admin), "green" (customer) */
  accent?: "indigo" | "amber" | "green";
}

const accentClasses = {
  indigo: "data-[state=checked]:bg-[#FF4D00]",
  amber:  "data-[state=checked]:bg-[#C6A34E]",
  green:  "data-[state=checked]:bg-[#34C759]",
};

function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  id: idProp,
  className,
  accent = "indigo",
}: SwitchProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=unchecked]:bg-white/20",
          accentClasses[accent]
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0",
            "transition-transform duration-200 ease-in-out",
            "data-[state=unchecked]:translate-x-0",
            "data-[state=checked]:translate-x-5"
          )}
        />
      </RadixSwitch.Root>

      {(label || description) && (
        <label
          htmlFor={id}
          className={cn(
            "flex flex-col gap-0.5 cursor-pointer select-none",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {label && <span className="text-sm font-medium leading-none">{label}</span>}
          {description && <span className="text-xs opacity-50 leading-snug">{description}</span>}
        </label>
      )}
    </div>
  );
}

export { Switch };
