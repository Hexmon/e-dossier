"use client";

import * as React from "react";

import { normalizeIndiaPhoneDigits } from "@/app/lib/forms/phone";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type IndiaPhoneInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value?: string | null;
  onValueChange: (value: string) => void;
};

const IndiaPhoneInput = React.forwardRef<HTMLInputElement, IndiaPhoneInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const digits = normalizeIndiaPhoneDigits(value);

    return (
      <div className="flex w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <span className="flex h-[var(--density-input-height)] items-center border-r bg-muted/40 px-3 text-sm font-medium text-muted-foreground">
          +91
        </span>
        <Input
          ref={ref}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={digits}
          maxLength={10}
          onChange={(event) => onValueChange(normalizeIndiaPhoneDigits(event.target.value))}
          className={cn("rounded-none border-0 shadow-none focus-visible:ring-0", className)}
          {...props}
        />
      </div>
    );
  }
);

IndiaPhoneInput.displayName = "IndiaPhoneInput";

export { IndiaPhoneInput };
