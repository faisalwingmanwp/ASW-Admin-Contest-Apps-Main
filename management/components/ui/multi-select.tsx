"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

export type Option = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: Option[];
  onChange: (selected: Option[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = (option: Option) => {
    onChange(selected.filter((s) => s.value !== option.value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selected.length > 0) {
          onChange(selected.slice(0, -1));
        }
      }
      // This is not a default behavior of the <input /> field
      if (e.key === "Escape") {
        input.blur();
        setOpen(false);
      }
    }
  };

  const selectables = options.filter(
    (option) => !selected.some((s) => s.value === option.value)
  );

  return (
    <div className={`relative ${className}`}>
      <Command
        onKeyDown={handleKeyDown}
        className="overflow-visible bg-transparent"
      >
        <div
          className={`flex w-full flex-wrap gap-1 rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
            disabled ? "bg-muted" : ""
          }`}
        >
          {selected.map((option) => (
            <Badge
              key={option.value}
              variant="secondary"
              className="rounded-sm px-1 py-0 focus:outline-none"
            >
              {option.label}
              {!disabled && (
                <button
                  type="button"
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(option);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(option)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </Badge>
          ))}
          
          {/* Avoid the input taking the full width */}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? placeholder : ""}
            disabled={disabled}
            className={`ml-1 flex-1 bg-transparent outline-none placeholder:text-muted-foreground ${
              disabled ? "cursor-not-allowed" : ""
            }`}
          />
        </div>
        
        <div className="relative">
          {open && selectables.length > 0 && (
            <div className="absolute top-2 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandGroup className="h-full overflow-auto max-h-52">
                {selectables.map((option) => (
                  <CommandItem
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={() => {
                      setInputValue("");
                      onChange([...selected, option]);
                    }}
                    className={"cursor-pointer"}
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          )}
        </div>
      </Command>
    </div>
  );
}
